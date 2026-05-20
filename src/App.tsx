import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Page = 'home' | 'questions' | 'diary' | 'history' | 'detail';
type WritingStyle = 'poetic' | 'reflective' | 'casual';

interface Emotion {
  id: string;
  name: string;
  emoji: string;
  color: string;
  gradient: string;
  particle: string;
  questions: string[];
  greeting: string;
  sortOrder: number;
}

interface AddEmotionInput {
  id: string;
  name: string;
  emoji: string;
  color: string;
  gradient: string;
  particle: string;
  greeting?: string;
  questions?: string[];
  baseOn?: string;
  sortOrder?: number;
}

interface DiaryEntry {
  id: string;
  emotionId: string;
  answers: string[];
  content: string;
  title: string;
  style: WritingStyle;
  createdAt: string;
  updatedAt: string;
}

interface Filters {
  search: string;
  emotion: string;
  startDate: string;
  endDate: string;
}

declare global {
  interface Window {
    addEmotion?: (emotion: AddEmotionInput) => Promise<Emotion>;
  }
}

const DIARY_SIGNATURE = 'Until tomorrow, Me';
const EMOTION_DB_NAME = 'mood-diary-db';
const EMOTION_DB_VERSION = 1;
const EMOTION_STORE_NAME = 'emotions';

const generateId = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36);

const sortEmotions = (list: Emotion[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN'));

const normalizeQuestions = (questions: string[]) => questions.map(question => question.trim()).filter(Boolean);

const normalizeEmotion = (
  emotion: Omit<Emotion, 'questions' | 'greeting' | 'sortOrder'> & {
    questions: string[];
    greeting?: string;
    sortOrder?: number;
  },
  fallbackSortOrder: number
): Emotion => ({
  id: emotion.id.trim(),
  name: emotion.name.trim(),
  emoji: emotion.emoji.trim(),
  color: emotion.color.trim(),
  gradient: emotion.gradient.trim(),
  particle: emotion.particle.trim(),
  questions: normalizeQuestions(emotion.questions),
  greeting: emotion.greeting?.trim() || `${emotion.name.trim()} ${emotion.emoji.trim()}，欢迎把这份情绪认真记录下来。`,
  sortOrder: typeof emotion.sortOrder === 'number' ? emotion.sortOrder : fallbackSortOrder
});

const validateEmotion = (emotion: Emotion) => {
  if (!emotion.id || !emotion.name || !emotion.emoji || !emotion.color || !emotion.gradient || !emotion.particle) {
    throw new Error('情绪缺少必要字段，至少需要 id、name、emoji、color、gradient、particle。');
  }

  if (emotion.questions.length !== 5) {
    throw new Error(`情绪「${emotion.name}」必须包含 5 个问题。`);
  }
};

const createMissingEmotion = (emotionId: string): Emotion => ({
  id: emotionId,
  name: emotionId,
  emoji: '📝',
  color: '#94A3B8',
  gradient: 'from-slate-400 via-slate-500 to-slate-600',
  particle: '✨',
  questions: ['这条记录对应的情绪暂时不可用。', '你想补充什么背景？', '这件事带来了哪些感受？', '你从中获得了什么？', '接下来想怎么做？'],
  greeting: '这条记录对应的情绪已不在当前列表中，但内容依然保留。',
  sortOrder: Number.MAX_SAFE_INTEGER
});

const extractTitle = (content: string): string => {
  const cleaned = content.replace('Dear Diary,', '').trim();
  const firstLine = cleaned.split('\n').find(line => line.trim().length > 0) || '';
  return firstLine.length > 60 ? `${firstLine.substring(0, 60)}...` : firstLine || '无标题';
};

const generateDiaryContent = (emotion: Emotion, answers: string[], style: WritingStyle): string => {
  const styleIntros: Record<WritingStyle, string> = {
    poetic: `今天的心情如${emotion.name}般，在时光的画布上留下温柔的痕迹。春风拂过心田，思绪如蝶翩翩起舞。`,
    reflective: `回顾今天，我的内心充满了${emotion.name}的情绪。这让我不禁停下脚步，深深地思考生命中的点滴际遇。`,
    casual: `嘿，今天的心情是${emotion.name}${emotion.emoji}！让我来随便记录一下今天发生的事情吧～`
  };

  const styleEndings: Record<WritingStyle, string> = {
    poetic: `\n\n如同${emotion.emoji}所诉说的那样，今日的我在这份${emotion.name}中找到了生命的韵律。愿这份情感如诗篇般，永远镌刻在记忆的深处。`,
    reflective: `\n\n通过今天的反思，我更加理解了自己的${emotion.name}情绪。每一种感受都是成长的礼物，我会继续倾听内心的声音，在自我探索的道路上不断前行。`,
    casual: '\n\n好啦，今天就记录到这里。不管怎样，明天又是新的一天，继续加油！生活还是要向前看的嘛～'
  };

  let content = `Dear Diary,\n\n${styleIntros[style]}\n\n`;

  emotion.questions.forEach((question, index) => {
    if (answers[index]) {
      content += `💭 ${question}\n${answers[index]}\n\n`;
    }
  });

  content += styleEndings[style];
  content += `\n\n${DIARY_SIGNATURE}`;

  return content;
};

const STORAGE_KEYS = {
  DIARIES: 'mood_diary_entries'
};

const loadDiaries = (): DiaryEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DIARIES);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveDiaries = (diaries: DiaryEntry[]) => {
  localStorage.setItem(STORAGE_KEYS.DIARIES, JSON.stringify(diaries));
};

const openEmotionDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = window.indexedDB.open(EMOTION_DB_NAME, EMOTION_DB_VERSION);

  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(EMOTION_STORE_NAME)) {
      database.createObjectStore(EMOTION_STORE_NAME, { keyPath: 'id' });
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('无法打开情绪数据库。'));
});

const readAllStoredEmotions = async (): Promise<Emotion[]> => {
  const database = await openEmotionDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(EMOTION_STORE_NAME, 'readonly');
    const store = transaction.objectStore(EMOTION_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      try {
        const normalized = (request.result as Emotion[]).map((emotion, index) => {
          const nextEmotion = normalizeEmotion(emotion, index);
          validateEmotion(nextEmotion);
          return nextEmotion;
        });
        resolve(sortEmotions(normalized));
      } catch (error) {
        reject(error);
      }
    };

    request.onerror = () => reject(request.error || new Error('读取情绪数据失败。'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error || new Error('读取情绪事务失败。'));
  });
};

const replaceStoredEmotions = async (emotions: Emotion[]) => {
  const database = await openEmotionDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(EMOTION_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(EMOTION_STORE_NAME);

    store.clear();
    emotions.forEach(emotion => {
      store.put(emotion);
    });

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('写入初始情绪失败。'));
    };
  });
};

const saveEmotionToStore = async (emotion: Emotion) => {
  const database = await openEmotionDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(EMOTION_STORE_NAME, 'readwrite');
    transaction.objectStore(EMOTION_STORE_NAME).put(emotion);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('保存新增情绪失败。'));
    };
  });
};

const loadInitialEmotions = async (): Promise<Emotion[]> => {
  const response = await fetch('/emotions.json', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('无法从 public/emotions.json 初始化情绪列表。');
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    throw new Error('public/emotions.json 的格式不正确。');
  }

  const emotions = payload.map((item, index) => {
    const emotion = normalizeEmotion(item as Emotion, index);
    validateEmotion(emotion);
    return emotion;
  });

  return sortEmotions(emotions);
};

const loadEmotionCatalog = async (): Promise<Emotion[]> => {
  const storedEmotions = await readAllStoredEmotions();
  if (storedEmotions.length > 0) {
    return storedEmotions;
  }

  const initialEmotions = await loadInitialEmotions();
  await replaceStoredEmotions(initialEmotions);
  return initialEmotions;
};

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [isEmotionReady, setIsEmotionReady] = useState(false);
  const [emotionLoadError, setEmotionLoadError] = useState('');
  const [selectedEmotionId, setSelectedEmotionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [diaryContent, setDiaryContent] = useState('');
  const [currentStyle, setCurrentStyle] = useState<WritingStyle>('casual');
  const [isEditing, setIsEditing] = useState(false);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [currentDiary, setCurrentDiary] = useState<DiaryEntry | null>(null);
  const [filters, setFilters] = useState<Filters>({ search: '', emotion: '', startDate: '', endDate: '' });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const diaryRef = useRef<HTMLTextAreaElement>(null);
  const emotionsRef = useRef<Emotion[]>([]);

  useEffect(() => {
    emotionsRef.current = emotions;
  }, [emotions]);

  useEffect(() => {
    let isActive = true;

    setDiaries(loadDiaries());

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleReduceMotionChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handleReduceMotionChange);

    loadEmotionCatalog()
      .then(loadedEmotions => {
        if (!isActive) return;
        setEmotions(loadedEmotions);
      })
      .catch(error => {
        if (!isActive) return;
        setEmotionLoadError(error instanceof Error ? error.message : '情绪初始化失败。');
      })
      .finally(() => {
        if (isActive) {
          setIsEmotionReady(true);
        }
      });

    return () => {
      isActive = false;
      mediaQuery.removeEventListener('change', handleReduceMotionChange);
    };
  }, []);

  useEffect(() => {
    if (isEditing && diaryRef.current) {
      diaryRef.current.focus();
      diaryRef.current.selectionStart = diaryRef.current.value.length;
    }
  }, [isEditing]);

  const emotionMap = useMemo(() => new Map(emotions.map(emotion => [emotion.id, emotion])), [emotions]);

  const selectedEmotion = useMemo(() => {
    if (!selectedEmotionId) return null;
    return emotionMap.get(selectedEmotionId) || createMissingEmotion(selectedEmotionId);
  }, [emotionMap, selectedEmotionId]);

  const getEmotionById = useCallback((emotionId: string) => emotionMap.get(emotionId) || createMissingEmotion(emotionId), [emotionMap]);

  const addEmotion = useCallback(async (input: AddEmotionInput) => {
    if (!isEmotionReady) {
      throw new Error('情绪列表仍在初始化，请稍后再试。');
    }

    const currentEmotions = emotionsRef.current;
    const rawId = typeof input.id === 'string' ? input.id : '';
    const rawName = typeof input.name === 'string' ? input.name : '';
    const rawEmoji = typeof input.emoji === 'string' ? input.emoji : '';
    const id = rawId.trim();

    if (!id || !rawName.trim() || !rawEmoji.trim()) {
      throw new Error('新增情绪至少需要提供有效的 id、name 和 emoji。');
    }

    if (currentEmotions.some(emotion => emotion.id === id)) {
      throw new Error(`情绪 id「${id}」已存在。`);
    }

    const customQuestions = normalizeQuestions(input.questions || []);
    let questions = customQuestions;

    if (questions.length === 0) {
      if (!input.baseOn) {
        throw new Error('新增情绪时必须提供 baseOn，或提供 5 个自定义问题。');
      }

      const baseEmotion = currentEmotions.find(emotion => emotion.id === input.baseOn);
      if (!baseEmotion) {
        throw new Error(`未找到 baseOn 指定的情绪「${input.baseOn}」。`);
      }

      questions = [...baseEmotion.questions];
    }

    if (questions.length !== 5) {
      throw new Error('questions 必须正好包含 5 个问题。');
    }

    const nextEmotion = normalizeEmotion(
      {
        ...input,
        id,
        questions,
        greeting: input.greeting || `${input.name.trim()} ${input.emoji.trim()}，欢迎把这份情绪认真记录下来。`,
        sortOrder: typeof input.sortOrder === 'number'
          ? input.sortOrder
          : currentEmotions.reduce((maxSortOrder, emotion) => Math.max(maxSortOrder, emotion.sortOrder), -1) + 1
      },
      currentEmotions.length
    );

    validateEmotion(nextEmotion);
    await saveEmotionToStore(nextEmotion);
    setEmotions(previous => sortEmotions([...previous, nextEmotion]));

    return nextEmotion;
  }, []);

  useEffect(() => {
    window.addEmotion = addEmotion;
    return () => {
      delete window.addEmotion;
    };
  }, [addEmotion]);

  const handleMouseMove = (event: React.MouseEvent) => {
    if (prefersReducedMotion) return;
    setMousePos({ x: event.clientX, y: event.clientY });
  };

  const handleInteractiveEnter = () => setIsHoveringInteractive(true);
  const handleInteractiveLeave = () => setIsHoveringInteractive(false);

  const handleEmotionSelect = (emotionId: string) => {
    setSelectedEmotionId(emotionId);
    setCurrentQuestion(0);
    setAnswers([]);
    setCurrentAnswer('');
    setCurrentDiary(null);
    setPage('questions');
  };

  const handleNextQuestion = () => {
    if (!selectedEmotion || !currentAnswer.trim()) return;

    const newAnswers = [...answers, currentAnswer];
    setAnswers(newAnswers);
    setCurrentAnswer('');

    if (currentQuestion < selectedEmotion.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      return;
    }

    const content = generateDiaryContent(selectedEmotion, newAnswers, currentStyle);
    setDiaryContent(content);
    setPage('diary');
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      const newAnswers = [...answers];
      setCurrentAnswer(newAnswers.pop() || '');
      setAnswers(newAnswers);
      setCurrentQuestion(currentQuestion - 1);
      return;
    }

    resetToHome();
  };

  const regenerateWithStyle = (style: WritingStyle) => {
    if (!selectedEmotion) return;

    setIsGenerating(true);
    setCurrentStyle(style);
    setTimeout(() => {
      const content = generateDiaryContent(selectedEmotion, answers, style);
      setDiaryContent(content);
      setIsGenerating(false);
    }, 500);
  };

  const addMoreDetails = () => {
    const details = '\n\n--- Additional Thoughts ---\n今天还有一些值得记录的事情：\n- \n- \n-';
    setDiaryContent(previous => previous.replace(`\n\n${DIARY_SIGNATURE}`, `${details}\n\n${DIARY_SIGNATURE}`));
    setIsEditing(true);
  };

  const saveDiary = () => {
    if (!selectedEmotion || !diaryContent.trim()) return;

    const now = new Date().toISOString();
    const newDiary: DiaryEntry = {
      id: currentDiary?.id || generateId(),
      emotionId: selectedEmotion.id,
      answers,
      content: diaryContent,
      title: extractTitle(diaryContent),
      style: currentStyle,
      createdAt: currentDiary?.createdAt || now,
      updatedAt: now
    };

    const updatedDiaries = currentDiary
      ? diaries.map(diary => (diary.id === currentDiary.id ? newDiary : diary))
      : [newDiary, ...diaries];

    setDiaries(updatedDiaries);
    saveDiaries(updatedDiaries);
    setCurrentDiary(newDiary);
    setIsEditing(false);
  };

  const resetToHome = () => {
    setPage('home');
    setSelectedEmotionId(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setCurrentAnswer('');
    setDiaryContent('');
    setCurrentStyle('casual');
    setIsEditing(false);
    setCurrentDiary(null);
  };

  const viewDiaryDetail = (diary: DiaryEntry) => {
    setSelectedEmotionId(diary.emotionId);
    setDiaryContent(diary.content);
    setCurrentDiary(diary);
    setAnswers(diary.answers);
    setCurrentStyle(diary.style);
    setPage('detail');
  };

  const deleteDiary = (id: string) => {
    if (!window.confirm('确定要删除这篇日记吗？此操作不可撤销。')) return;

    const updated = diaries.filter(diary => diary.id !== id);
    setDiaries(updated);
    saveDiaries(updated);
  };

  const filteredDiaries = useMemo(() => diaries.filter(diary => {
    const emotion = getEmotionById(diary.emotionId);

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = diary.content.toLowerCase().includes(searchLower)
        || diary.title.toLowerCase().includes(searchLower)
        || emotion.name.includes(filters.search);

      if (!matchesSearch) {
        return false;
      }
    }

    if (filters.emotion && diary.emotionId !== filters.emotion) {
      return false;
    }

    if (filters.startDate && new Date(diary.createdAt) < new Date(filters.startDate)) {
      return false;
    }

    if (filters.endDate && new Date(diary.createdAt) > new Date(`${filters.endDate}T23:59:59`)) {
      return false;
    }

    return true;
  }), [diaries, filters, getEmotionById]);

  const stats = useMemo(() => {
    const emotionCounts: Record<string, number> = {};

    diaries.forEach(diary => {
      emotionCounts[diary.emotionId] = (emotionCounts[diary.emotionId] || 0) + 1;
    });

    let mostCommonEmotionId = '';
    let maxCount = 0;

    Object.entries(emotionCounts).forEach(([emotionId, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonEmotionId = emotionId;
      }
    });

    return {
      total: diaries.length,
      emotionCounts,
      mostCommonEmotionId,
      maxCount
    };
  }, [diaries]);

  const floatingParticles = useMemo(() => {
    if (!selectedEmotion) return [];

    return Array.from({ length: 15 }, (_, index) => ({
      id: index,
      emoji: selectedEmotion.particle,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 16 + Math.random() * 24,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 12
    }));
  }, [selectedEmotion]);

  const CustomCursor = () => (
    <div
      className={`fixed pointer-events-none z-50 rounded-full ${prefersReducedMotion ? 'hidden' : ''}`}
      style={{
        left: mousePos.x - 16,
        top: mousePos.y - 16,
        width: 32,
        height: 32,
        background: `radial-gradient(circle, ${selectedEmotion?.color || 'rgba(255,255,255,0.3)'} 0%, transparent 70%)`,
        transform: isHoveringInteractive ? 'scale(2.5)' : 'scale(1)',
        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
        opacity: isHoveringInteractive ? 0.6 : 0.3
      }}
    />
  );

  const renderHome = () => {
    if (!isEmotionReady) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center text-white">
            <div className="text-5xl mb-4 animate-pulse">⏳</div>
            <h1 className="text-3xl font-bold mb-2">正在加载情绪列表</h1>
            <p className="text-white/80">首次启动会自动从 public/emotions.json 初始化到 IndexedDB。</p>
          </div>
        </div>
      );
    }

    if (emotionLoadError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg text-center bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-white border border-white/20">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold mb-3">情绪数据加载失败</h1>
            <p className="text-white/80 mb-6">{emotionLoadError}</p>
            <button
              onClick={() => window.location.reload()}
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
              className="px-6 py-3 bg-white/20 rounded-full font-semibold hover:bg-white/30 transition-all duration-300"
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen p-4 md:p-8">
        <div
          className="fixed inset-0 overflow-hidden pointer-events-none"
          style={{ transform: prefersReducedMotion ? 'none' : `translate(${(mousePos.x - window.innerWidth / 2) * 0.01}px, ${(mousePos.y - window.innerHeight / 2) * 0.01}px)` }}
        >
          {floatingParticles.map(particle => (
            <span
              key={particle.id}
              className={`absolute ${prefersReducedMotion ? '' : 'animate-bounce'}`}
              style={{ left: particle.left, top: particle.top, fontSize: particle.size, opacity: 0.3, animationDelay: `${particle.delay}s`, animationDuration: `${particle.duration}s` }}
            >
              {particle.emoji}
            </span>
          ))}
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">每日情绪日记</h1>
            <p className="text-lg md:text-xl text-white/80">今天的你，心情如何？</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5 mb-8">
            {emotions.map((emotion, index) => (
              <button
                key={emotion.id}
                onClick={() => handleEmotionSelect(emotion.id)}
                onMouseEnter={handleInteractiveEnter}
                onMouseLeave={handleInteractiveLeave}
                className="group relative p-4 md:p-6 rounded-2xl backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${emotion.color}30, ${emotion.color}60)`,
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="text-4xl md:text-5xl mb-2 md:mb-3 group-hover:scale-125 transition-transform duration-300">{emotion.emoji}</div>
                <div className="text-base md:text-lg font-semibold text-white drop-shadow">{emotion.name}</div>
              </button>
            ))}
          </div>

          {emotions.length === 0 && (
            <div className="text-center text-white/80 mb-8">
              目前还没有可用情绪，可以在开发者控制台调用 addEmotion(...) 动态添加。
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={() => setPage('history')}
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
              className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-full text-white font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 flex items-center gap-2 hover:scale-105"
            >
              <span>📚</span>
              <span>日记记录与统计</span>
              {diaries.length > 0 && (
                <span className="bg-white/30 px-2 py-0.5 rounded-full text-sm">{diaries.length}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderQuestions = () => {
    if (!selectedEmotion) return null;

    const progress = ((currentQuestion + 1) / selectedEmotion.questions.length) * 100;

    return (
      <div className={`min-h-screen bg-gradient-to-br ${selectedEmotion.gradient} p-4 md:p-8 flex items-center justify-center`}>
        <CustomCursor />

        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {floatingParticles.map(particle => (
            <span
              key={particle.id}
              className={`absolute ${prefersReducedMotion ? '' : 'animate-pulse'}`}
              style={{ left: particle.left, top: particle.top, fontSize: particle.size, opacity: 0.25, animationDelay: `${particle.delay}s` }}
            >
              {particle.emoji}
            </span>
          ))}
        </div>

        <div className="max-w-2xl w-full bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-6 md:p-10 relative z-10">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{selectedEmotion.emoji}</div>
            <p className="text-gray-600 italic">{selectedEmotion.greeting}</p>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>问题 {currentQuestion + 1} / {selectedEmotion.questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%`, backgroundColor: selectedEmotion.color }}
              />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4 leading-relaxed">
              {selectedEmotion.questions[currentQuestion]}
            </h2>
            <textarea
              value={currentAnswer}
              onChange={event => setCurrentAnswer(event.target.value)}
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
              placeholder="在这里写下你的想法..."
              className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl focus:border-4 focus:outline-none transition-colors duration-300 resize-none text-gray-700 text-base"
              style={{ '--tw-ring-color': selectedEmotion.color } as React.CSSProperties}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handlePrevQuestion}
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
              className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300"
            >
              {currentQuestion === 0 ? '返回' : '上一步'}
            </button>
            <button
              onClick={handleNextQuestion}
              disabled={!currentAnswer.trim()}
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300 ${!currentAnswer.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg'}`}
              style={{ backgroundColor: selectedEmotion.color }}
            >
              {currentQuestion === selectedEmotion.questions.length - 1 ? '生成日记 ✨' : '下一步 →'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDiary = (isDetail = false) => {
    if (!selectedEmotion) return null;

    return (
      <div className={`min-h-screen bg-gradient-to-br ${selectedEmotion.gradient} p-4 md:p-8`}>
        <CustomCursor />

        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {floatingParticles.map(particle => (
            <span
              key={particle.id}
              className={`absolute ${prefersReducedMotion ? '' : 'animate-bounce'}`}
              style={{ left: particle.left, top: particle.top, fontSize: particle.size, opacity: 0.2, animationDelay: `${particle.delay}s`, animationDuration: `${particle.duration}s` }}
            >
              {particle.emoji}
            </span>
          ))}
        </div>

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={isDetail ? () => setPage('history') : resetToHome}
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all duration-300 flex items-center gap-2"
            >
              <span>←</span>
              <span>{isDetail ? '返回列表' : '返回首页'}</span>
            </button>
            <div className="text-4xl bg-white/20 p-3 rounded-full backdrop-blur-sm">{selectedEmotion.emoji}</div>
          </div>

          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden">
            {!isDetail && (
              <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 justify-center">
                {(['poetic', 'reflective', 'casual'] as const).map(style => (
                  <button
                    key={style}
                    onClick={() => regenerateWithStyle(style)}
                    onMouseEnter={handleInteractiveEnter}
                    onMouseLeave={handleInteractiveLeave}
                    disabled={isGenerating}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${currentStyle === style ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    style={{ backgroundColor: currentStyle === style ? selectedEmotion.color : undefined }}
                  >
                    {style === 'poetic' ? '🌸 诗意' : style === 'reflective' ? '💭 反思' : '✨ 随意'}
                  </button>
                ))}
              </div>
            )}

            <div className="p-6 md:p-8">
              {isGenerating ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl animate-spin mb-4">✨</div>
                    <p className="text-gray-500">正在生成日记...</p>
                  </div>
                </div>
              ) : isEditing ? (
                <textarea
                  ref={diaryRef}
                  value={diaryContent}
                  onChange={event => setDiaryContent(event.target.value)}
                  onMouseEnter={handleInteractiveEnter}
                  onMouseLeave={handleInteractiveLeave}
                  className="w-full h-80 p-4 border-2 rounded-xl focus:outline-none resize-none text-gray-700 font-serif leading-relaxed"
                  style={{ borderColor: selectedEmotion.color }}
                />
              ) : (
                <div className="min-h-80 whitespace-pre-wrap font-serif text-gray-700 leading-loose text-base md:text-lg">
                  {diaryContent}
                </div>
              )}
            </div>

            <div className="p-4 md:p-6 bg-gray-50 flex flex-wrap gap-3 justify-center">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    onMouseEnter={handleInteractiveEnter}
                    onMouseLeave={handleInteractiveLeave}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300 transition-all duration-300"
                  >
                    取消编辑
                  </button>
                  <button
                    onClick={saveDiary}
                    onMouseEnter={handleInteractiveEnter}
                    onMouseLeave={handleInteractiveLeave}
                    className="px-6 py-2 rounded-full font-medium text-white transition-all duration-300 hover:scale-105"
                    style={{ backgroundColor: selectedEmotion.color }}
                  >
                    保存日记 💾
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    onMouseEnter={handleInteractiveEnter}
                    onMouseLeave={handleInteractiveLeave}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300 transition-all duration-300"
                  >
                    ✏️ 编辑
                  </button>
                  {!isDetail && (
                    <button
                      onClick={addMoreDetails}
                      onMouseEnter={handleInteractiveEnter}
                      onMouseLeave={handleInteractiveLeave}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300 transition-all duration-300"
                    >
                      ➕ 补充细节
                    </button>
                  )}
                  <button
                    onClick={saveDiary}
                    onMouseEnter={handleInteractiveEnter}
                    onMouseLeave={handleInteractiveLeave}
                    className="px-6 py-2 rounded-full font-medium text-white transition-all duration-300 hover:scale-105"
                    style={{ backgroundColor: selectedEmotion.color }}
                  >
                    {isDetail ? '💾 更新保存' : '📝 保存日记'}
                  </button>
                </>
              )}
            </div>
          </div>

          {currentDiary && (
            <div className="text-center mt-4 text-white/80 text-sm">
              创建于 {new Date(currentDiary.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    const mostCommonEmotion = stats.mostCommonEmotionId ? getEmotionById(stats.mostCommonEmotionId) : null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-4 md:p-8">
        <CustomCursor />

        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <button
              onClick={resetToHome}
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
              className="self-start md:self-auto px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
            >
              <span>←</span>
              <span>返回首页</span>
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-white">📚 日记记录与统计</h1>
            <div className="text-white/60 text-sm">共 {diaries.length} 条日记</div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>🔍</span> 筛选与搜索
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="🔍 搜索内容或情绪..."
                value={filters.search}
                onChange={event => setFilters(previous => ({ ...previous, search: event.target.value }))}
                onMouseEnter={handleInteractiveEnter}
                onMouseLeave={handleInteractiveLeave}
                className="px-4 py-3 rounded-xl bg-white/90 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <select
                value={filters.emotion}
                onChange={event => setFilters(previous => ({ ...previous, emotion: event.target.value }))}
                onMouseEnter={handleInteractiveEnter}
                onMouseLeave={handleInteractiveLeave}
                className="px-4 py-3 rounded-xl bg-white/90 text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="">所有情绪</option>
                {emotions.map(emotion => (
                  <option key={emotion.id} value={emotion.id}>{emotion.emoji} {emotion.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={filters.startDate}
                onChange={event => setFilters(previous => ({ ...previous, startDate: event.target.value }))}
                onMouseEnter={handleInteractiveEnter}
                onMouseLeave={handleInteractiveLeave}
                placeholder="开始日期"
                className="px-4 py-3 rounded-xl bg-white/90 text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={event => setFilters(previous => ({ ...previous, endDate: event.target.value }))}
                onMouseEnter={handleInteractiveEnter}
                onMouseLeave={handleInteractiveLeave}
                placeholder="结束日期"
                className="px-4 py-3 rounded-xl bg-white/90 text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            {(filters.search || filters.emotion || filters.startDate || filters.endDate) && (
              <button
                onClick={() => setFilters({ search: '', emotion: '', startDate: '', endDate: '' })}
                onMouseEnter={handleInteractiveEnter}
                onMouseLeave={handleInteractiveLeave}
                className="mt-3 px-4 py-2 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30 transition-all"
              >
                ✕ 清除筛选
              </button>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>📊</span> 情绪统计
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-white">{stats.total}</div>
                <div className="text-white/70 text-sm">总日记数</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="text-3xl">{mostCommonEmotion?.emoji || '—'}</div>
                <div className="text-white font-semibold">{mostCommonEmotion?.name || '暂无'}</div>
                <div className="text-white/70 text-sm">最常见情绪</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-white">{stats.maxCount || 0}</div>
                <div className="text-white/70 text-sm">最多次数</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-white">{new Set(diaries.map(diary => diary.emotionId)).size}</div>
                <div className="text-white/70 text-sm">情绪种类</div>
              </div>
            </div>

            <div className="space-y-3">
              {emotions.map(emotion => {
                const count = stats.emotionCounts[emotion.id] || 0;
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

                return (
                  <div key={emotion.id} className="flex items-center gap-3">
                    <div className="w-10 text-center text-xl">{emotion.emoji}</div>
                    <div className="w-12 text-white/80 text-sm font-medium">{emotion.name}</div>
                    <div className="flex-1 h-7 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(percentage, count > 0 ? 10 : 0)}%`, backgroundColor: emotion.color }}
                      >
                        {count > 0 && <span className="text-xs text-white font-medium drop-shadow">{count}</span>}
                      </div>
                    </div>
                    <div className="w-14 text-right text-white/80 text-sm font-medium">{percentage.toFixed(0)}%</div>
                    <div className="w-4 h-4 rounded-full shadow" style={{ backgroundColor: emotion.color }} title={emotion.name} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span>📝</span> 日记列表
              </h2>
              <span className="text-white/60 text-sm">{filteredDiaries.length} 条结果</span>
            </div>

            {filteredDiaries.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-white/70 text-lg">
                  {diaries.length === 0 ? '还没有日记，快去记录心情吧！' : '没有符合条件的日记'}
                </p>
                {diaries.length === 0 && (
                  <button
                    onClick={resetToHome}
                    onMouseEnter={handleInteractiveEnter}
                    onMouseLeave={handleInteractiveLeave}
                    className="mt-4 px-6 py-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-all"
                  >
                    开始记录
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDiaries.map(diary => {
                  const emotion = getEmotionById(diary.emotionId);

                  return (
                    <div
                      key={diary.id}
                      className="bg-white/90 rounded-xl p-4 flex items-start gap-4 hover:bg-white transition-all duration-300 hover:shadow-lg"
                      style={{ borderLeft: `5px solid ${emotion.color}` }}
                    >
                      <div className="text-4xl">{emotion.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-semibold text-gray-800 truncate cursor-pointer hover:underline"
                          onClick={() => viewDiaryDetail(diary)}
                        >
                          {diary.title}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span>📅 {new Date(diary.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          <span>🏷️ {emotion.name}</span>
                        </div>
                        <div className="text-gray-600 text-sm mt-2 line-clamp-2">
                          {diary.content.replace('Dear Diary,', '').substring(0, 120)}...
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => viewDiaryDetail(diary)}
                          onMouseEnter={handleInteractiveEnter}
                          onMouseLeave={handleInteractiveLeave}
                          className="px-3 py-1.5 bg-sky-100 text-sky-700 rounded-lg text-sm font-medium hover:bg-sky-200 transition-all"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => deleteDiary(diary.id)}
                          onMouseEnter={handleInteractiveEnter}
                          onMouseLeave={handleInteractiveLeave}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-all"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen transition-all duration-700 ${selectedEmotion ? `bg-gradient-to-br ${selectedEmotion.gradient}` : 'bg-gradient-to-br from-sky-400 via-cyan-500 to-teal-500'}`}
      onMouseMove={handleMouseMove}
    >
      {page === 'home' && renderHome()}
      {page === 'questions' && renderQuestions()}
      {page === 'diary' && renderDiary(false)}
      {page === 'history' && renderHistory()}
      {page === 'detail' && renderDiary(true)}
    </div>
  );
}
