import React, { useState, useEffect, useMemo, useRef } from 'react';

interface Emotion {
  id: string;
  name: string;
  emoji: string;
  color: string;
  gradient: string;
  particle: string;
  questions: string[];
  greeting: string;
}

interface DiaryEntry {
  id: string;
  emotionId: string;
  answers: string[];
  content: string;
  title: string;
  style: string;
  createdAt: string;
  updatedAt: string;
}

interface Filters {
  search: string;
  emotion: string;
  startDate: string;
  endDate: string;
}

const emotions: Emotion[] = [
  {
    id: 'happy',
    name: '开心',
    emoji: '😊',
    color: '#FFD93D',
    gradient: 'from-yellow-400 via-orange-300 to-amber-500',
    particle: '✨',
    questions: ['今天有什么让你快乐的事情发生？', '谁让你今天感到开心？', '这个快乐的时刻教会了你什么？', '你想如何延续这份快乐？', '你希望明天也有这样的心情吗？'],
    greeting: '很高兴看到你今天心情不错！✨'
  },
  {
    id: 'sad',
    name: '悲伤',
    emoji: '😢',
    color: '#6B8DD6',
    gradient: 'from-blue-400 via-blue-500 to-cyan-600',
    particle: '💧',
    questions: ['是什么让你今天感到悲伤？', '这种悲伤的感觉持续多久了？', '你觉得需要有人陪伴你吗？', '有没有什么小事能让你感觉好一点？', '你想对现在的自己说些什么？'],
    greeting: '我理解你现在可能不太好受，让我陪伴你。💙'
  },
  {
    id: 'anxious',
    name: '焦虑',
    emoji: '😰',
    color: '#FF8C42',
    gradient: 'from-orange-400 via-amber-400 to-yellow-500',
    particle: '🌀',
    questions: ['是什么让你今天感到焦虑？', '这种焦虑感有多强烈？', '有什么是你现在可以控制的？', '深呼吸，现在最让你担心的是什么？', '你想如何缓解这种情绪？'],
    greeting: '焦虑是正常的，让我们一起理清思绪。🌬️'
  },
  {
    id: 'calm',
    name: '平静',
    emoji: '😌',
    color: '#88D498',
    gradient: 'from-green-300 via-emerald-400 to-teal-500',
    particle: '🍃',
    questions: ['是什么让你感到如此平静？', '你是如何达到这种状态的？', '在这种平静中你注意到了什么？', '你想用这份宁静的时光做什么？', '如何在日常中保持这种心境？'],
    greeting: '享受这份宁静的时刻吧。🍃'
  },
  {
    id: 'bored',
    name: '无聊',
    emoji: '😐',
    color: '#A8A8A8',
    gradient: 'from-gray-400 via-slate-400 to-zinc-500',
    particle: '💭',
    questions: ['你觉得今天为什么会无聊？', '有没有什么一直想尝试但没做的事？', '如果可以做任何事，你想做什么？', '最近有什么让你感兴趣的事物？', '明天你希望有什么不同？'],
    greeting: '无聊也是一种信号，也许是时候尝试新事物了。💭'
  },
  {
    id: 'excited',
    name: '兴奋',
    emoji: '🤩',
    color: '#FF6B9D',
    gradient: 'from-pink-400 via-rose-500 to-red-400',
    particle: '⚡',
    questions: ['什么事情让你如此兴奋？', '你已经期待多久了？', '这件事对你意味着什么？', '你想和谁分享这份兴奋？', '这份兴奋感让你想到了什么？'],
    greeting: '哇！感受到你的能量了！⚡'
  },
  {
    id: 'frustrated',
    name: '沮丧',
    emoji: '😤',
    color: '#E85D75',
    gradient: 'from-red-400 via-rose-500 to-pink-600',
    particle: '💢',
    questions: ['是什么让你今天感到沮丧？', '这种情况持续多久了？', '你觉得问题出在哪里？', '有没有人可以帮助你？', '如果问题解决了会怎样？'],
    greeting: '沮丧说明你在乎，让我们一起面对。❤️'
  },
  {
    id: 'grateful',
    name: '感恩',
    emoji: '🙏',
    color: '#F0A6CA',
    gradient: 'from-pink-300 via-rose-300 to-orange-300',
    particle: '💝',
    questions: ['今天你最感恩的是什么？', '有谁让你心存感激？', '你从这份感恩中学到了什么？', '你想如何表达这份感谢？', '这份感恩让你对未来有什么期待？'],
    greeting: '感恩的心让生活更美好。💝'
  },
  {
    id: 'confused',
    name: '困惑',
    emoji: '😕',
    color: '#9B8AC4',
    gradient: 'from-cyan-400 via-teal-400 to-emerald-500',
    particle: '❓',
    questions: ['什么事情让你感到困惑？', '你觉得困惑的根源是什么？', '有没有人可能帮你解答？', '如果答案出现了会怎样？', '困惑本身教会了你什么？'],
    greeting: '困惑意味着你在思考和成长。🌱'
  }
];

const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const extractTitle = (content: string): string => {
  const cleaned = content.replace('Dear Diary,', '').trim();
  const firstLine = cleaned.split('\n').find(line => line.trim().length > 0) || '';
  return firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine || '无标题';
};

const generateDiaryContent = (emotion: Emotion, answers: string[], style: string): string => {
  const styleIntros: Record<string, string> = {
    poetic: `今天的心情如${emotion.name}般，在时光的画布上留下温柔的痕迹。春风拂过心田，思绪如蝶翩翩起舞。`,
    reflective: `回顾今天，我的内心充满了${emotion.name}的情绪。这让我不禁停下脚步，深深地思考生命中的点滴际遇。`,
    casual: `嘿，今天的心情是${emotion.name}${emotion.emoji}！让我来随便记录一下今天发生的事情吧～`
  };

  const styleEndings: Record<string, string> = {
    poetic: `\n\n如同${emotion.emoji}所诉说的那样，今日的我在这份${emotion.name}中找到了生命的韵律。愿这份情感如诗篇般，永远镌刻在记忆的深处。`,
    reflective: `\n\n通过今天的反思，我更加理解了自己的${emotion.name}情绪。每一种感受都是成长的礼物，我会继续倾听内心的声音，在自我探索的道路上不断前行。`,
    casual: `\n\n好啦，今天就记录到这里。不管怎样，明天又是新的一天，继续加油！生活还是要向前看的嘛～`
  };

  let content = `Dear Diary,\n\n${styleIntros[style] || styleIntros.casual}\n\n`;
  
  emotion.questions.forEach((question, index) => {
    if (answers[index]) {
      content += `💭 ${question}\n${answers[index]}\n\n`;
    }
  });

  content += styleEndings[style] || styleEndings.casual;
  content += `\n\nUntil tomorrow, Me`;

  return content;
};

const STORAGE_KEYS = {
  DIARIES: 'mood_diary_entries',
  LATEST: 'mood_diary_latest'
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

export default function App() {
  const [page, setPage] = useState<'home' | 'questions' | 'diary' | 'history' | 'detail'>('home');
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [diaryContent, setDiaryContent] = useState('');
  const [currentStyle, setCurrentStyle] = useState('casual');
  const [isEditing, setIsEditing] = useState(false);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [currentDiary, setCurrentDiary] = useState<DiaryEntry | null>(null);
  const [filters, setFilters] = useState<Filters>({ search: '', emotion: '', startDate: '', endDate: '' });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const diaryRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDiaries(loadDiaries());
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isEditing && diaryRef.current) {
      diaryRef.current.focus();
      diaryRef.current.selectionStart = diaryRef.current.value.length;
    }
  }, [isEditing]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (prefersReducedMotion) return;
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleInteractiveEnter = () => setIsHoveringInteractive(true);
  const handleInteractiveLeave = () => setIsHoveringInteractive(false);

  const handleEmotionSelect = (emotion: Emotion) => {
    setSelectedEmotion(emotion);
    setCurrentQuestion(0);
    setAnswers([]);
    setCurrentAnswer('');
    setPage('questions');
  };

  const handleNextQuestion = () => {
    if (!currentAnswer.trim()) return;
    const newAnswers = [...answers, currentAnswer];
    setAnswers(newAnswers);
    setCurrentAnswer('');
    
    if (selectedEmotion && currentQuestion < selectedEmotion.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else if (selectedEmotion) {
      const content = generateDiaryContent(selectedEmotion, newAnswers, currentStyle);
      setDiaryContent(content);
      setPage('diary');
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      const newAnswers = [...answers];
      setCurrentAnswer(newAnswers.pop() || '');
      setAnswers(newAnswers);
      setCurrentQuestion(currentQuestion - 1);
    } else {
      resetToHome();
    }
  };

  const regenerateWithStyle = (style: string) => {
    if (selectedEmotion) {
      setIsGenerating(true);
      setCurrentStyle(style);
      setTimeout(() => {
        const content = generateDiaryContent(selectedEmotion, answers, style);
        setDiaryContent(content);
        setIsGenerating(false);
      }, 500);
    }
  };

  const addMoreDetails = () => {
    const details = `\n\n--- Additional Thoughts ---\n今天还有一些值得记录的事情：\n- \n- \n-`;
    setDiaryContent(prev => prev.replace('\n\nUntil tomorrow, Me', details + '\n\nUntil tomorrow, Me'));
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

    let updatedDiaries: DiaryEntry[];
    if (currentDiary) {
      updatedDiaries = diaries.map(d => d.id === currentDiary.id ? newDiary : d);
    } else {
      updatedDiaries = [newDiary, ...diaries];
    }

    setDiaries(updatedDiaries);
    saveDiaries(updatedDiaries);
    setCurrentDiary(newDiary);
    setIsEditing(false);
  };

  const resetToHome = () => {
    setPage('home');
    setSelectedEmotion(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setCurrentAnswer('');
    setDiaryContent('');
    setCurrentStyle('casual');
    setIsEditing(false);
    setCurrentDiary(null);
  };

  const viewDiaryDetail = (diary: DiaryEntry) => {
    const emotion = emotions.find(e => e.id === diary.emotionId);
    if (emotion) {
      setSelectedEmotion(emotion);
      setDiaryContent(diary.content);
      setCurrentDiary(diary);
      setAnswers(diary.answers);
      setCurrentStyle(diary.style);
      setPage('detail');
    }
  };

  const deleteDiary = (id: string) => {
    if (window.confirm('确定要删除这篇日记吗？此操作不可撤销。')) {
      const updated = diaries.filter(d => d.id !== id);
      setDiaries(updated);
      saveDiaries(updated);
    }
  };

  const filteredDiaries = useMemo(() => {
    return diaries.filter(diary => {
      const emotion = emotions.find(e => e.id === diary.emotionId);
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = diary.content.toLowerCase().includes(searchLower) ||
                              diary.title.toLowerCase().includes(searchLower) ||
                              emotion?.name.includes(filters.search);
        if (!matchesSearch) return false;
      }
      if (filters.emotion && diary.emotionId !== filters.emotion) return false;
      if (filters.startDate && new Date(diary.createdAt) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(diary.createdAt) > new Date(filters.endDate + 'T23:59:59')) return false;
      return true;
    });
  }, [diaries, filters]);

  const stats = useMemo(() => {
    const emotionCounts: Record<string, number> = {};
    diaries.forEach(d => {
      emotionCounts[d.emotionId] = (emotionCounts[d.emotionId] || 0) + 1;
    });
    const total = diaries.length;
    let mostCommon = '';
    let maxCount = 0;
    Object.entries(emotionCounts).forEach(([id, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = id;
      }
    });
    return { total, emotionCounts, mostCommon, maxCount };
  }, [diaries]);

  const floatingParticles = useMemo(() => {
    if (!selectedEmotion) return [];
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
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

  const renderHome = () => (
    <div className="min-h-screen p-4 md:p-8">
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ transform: prefersReducedMotion ? 'none' : `translate(${(mousePos.x - window.innerWidth / 2) * 0.01}px, ${(mousePos.y - window.innerHeight / 2) * 0.01}px)` }}
      >
        {floatingParticles.map(p => (
          <span
            key={p.id}
            className={`absolute ${prefersReducedMotion ? '' : 'animate-bounce'}`}
            style={{ left: p.left, top: p.top, fontSize: p.size, opacity: 0.3, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
          >
            {p.emoji}
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
              onClick={() => handleEmotionSelect(emotion)}
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

  const renderQuestions = () => {
    if (!selectedEmotion) return null;
    const progress = ((currentQuestion + 1) / selectedEmotion.questions.length) * 100;

    return (
      <div className={`min-h-screen bg-gradient-to-br ${selectedEmotion.gradient} p-4 md:p-8 flex items-center justify-center`}>
        <CustomCursor />

        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {floatingParticles.map(p => (
            <span
              key={p.id}
              className={`absolute ${prefersReducedMotion ? '' : 'animate-pulse'}`}
              style={{ left: p.left, top: p.top, fontSize: p.size, opacity: 0.25, animationDelay: `${p.delay}s` }}
            >
              {p.emoji}
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
              onChange={(e) => setCurrentAnswer(e.target.value)}
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
          {floatingParticles.map(p => (
            <span
              key={p.id}
              className={`absolute ${prefersReducedMotion ? '' : 'animate-bounce'}`}
              style={{ left: p.left, top: p.top, fontSize: p.size, opacity: 0.2, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
            >
              {p.emoji}
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
                  onChange={(e) => setDiaryContent(e.target.value)}
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

  const renderHistory = () => (
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
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
              className="px-4 py-3 rounded-xl bg-white/90 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <select
              value={filters.emotion}
              onChange={(e) => setFilters(prev => ({ ...prev, emotion: e.target.value }))}
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
              className="px-4 py-3 rounded-xl bg-white/90 text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="">所有情绪</option>
              {emotions.map(e => (
                <option key={e.id} value={e.id}>{e.emoji} {e.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
              placeholder="开始日期"
              className="px-4 py-3 rounded-xl bg-white/90 text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
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
              <div className="text-3xl">{emotions.find(e => e.id === stats.mostCommon)?.emoji || '—'}</div>
              <div className="text-white font-semibold">{emotions.find(e => e.id === stats.mostCommon)?.name || '暂无'}</div>
              <div className="text-white/70 text-sm">最常见情绪</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{stats.maxCount || 0}</div>
              <div className="text-white/70 text-sm">最多次数</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{new Set(diaries.map(d => d.emotionId)).size}</div>
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
                  <div
                    className="w-4 h-4 rounded-full shadow"
                    style={{ backgroundColor: emotion.color }}
                    title={emotion.name}
                  />
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
                const emotion = emotions.find(e => e.id === diary.emotionId);
                return (
                  <div
                    key={diary.id}
                    className="bg-white/90 rounded-xl p-4 flex items-start gap-4 hover:bg-white transition-all duration-300 hover:shadow-lg"
                    style={{ borderLeft: `5px solid ${emotion?.color}` }}
                  >
                    <div className="text-4xl">{emotion?.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-semibold text-gray-800 truncate cursor-pointer hover:underline"
                        onClick={() => viewDiaryDetail(diary)}
                      >
                        {diary.title}
                      </div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span>📅 {new Date(diary.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        <span>🏷️ {emotion?.name}</span>
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