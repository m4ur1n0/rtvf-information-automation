'use client';

import { useState, useEffect } from 'react';

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  category: 'cast' | 'props' | 'crew' | 'misc';
  createdAt: Date;
  expiresAt: Date;
  urgent: boolean;
}

// Mock data with various expiration times
const MOCK_POSTS: Post[] = [
  {
    id: 1,
    title: 'URGENT: Need replacement actor for tonight\'s show',
    content: 'Our lead actor is sick. Need someone who knows the role of Hamlet. Show starts at 7 PM!',
    author: 'Sarah Chen',
    category: 'cast',
    createdAt: new Date('2026-02-10T14:00:00'),
    expiresAt: new Date('2026-02-12T19:00:00'),
    urgent: true,
  },
  {
    id: 2,
    title: 'Looking for vintage telephone prop',
    content: 'Need a rotary phone for tomorrow\'s rehearsal. Can return it by Friday. Will credit you in the program!',
    author: 'Mike Torres',
    category: 'props',
    createdAt: new Date('2026-02-09T10:00:00'),
    expiresAt: new Date('2026-02-14T17:00:00'),
    urgent: false,
  },
  {
    id: 3,
    title: 'Sound tech needed for weekend show',
    content: 'Our regular sound person had a family emergency. Need someone comfortable with a Yamaha mixer. Paid gig, $200.',
    author: 'Jessica Park',
    category: 'crew',
    createdAt: new Date('2026-02-08T15:30:00'),
    expiresAt: new Date('2026-02-22T23:59:00'),
    urgent: true,
  },
  {
    id: 4,
    title: 'Free costume rack - must pick up today',
    content: 'Clearing out storage. Heavy duty rolling rack, great condition. First come first served!',
    author: 'David Kim',
    category: 'misc',
    createdAt: new Date('2026-02-07T09:00:00'),
    expiresAt: new Date('2026-02-16T18:00:00'),
    urgent: false,
  },
  {
    id: 5,
    title: 'Backup dancers for flash mob',
    content: 'This is an example of an expired post that won\'t show by default.',
    author: 'Alex Rivera',
    category: 'cast',
    createdAt: new Date('2026-01-15T10:00:00'),
    expiresAt: new Date('2026-02-01T23:59:00'),
    urgent: false,
  },
];

function getTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff < 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'now';
}

function PostRow({ post, currentTime }: { post: Post; currentTime: Date }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpired = post.expiresAt <= currentTime;
  const timeRemaining = post.expiresAt.getTime() - currentTime.getTime();

  const getStatusColor = () => {
    if (isExpired) return 'status-closed';
    if (timeRemaining < 6 * 60 * 60 * 1000) return 'status-upcoming'; // < 6 hours
    return 'status-open';
  };

  const getCategoryIcon = () => {
    switch (post.category) {
      case 'cast': return '🎭';
      case 'props': return '📦';
      case 'crew': return '🎬';
      case 'misc': return '📌';
    }
  };

  return (
    <div className="compact-row">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="compact-row-header"
        aria-expanded={isExpanded}
      >
        <div className="compact-row-main">
          <div className="compact-row-id">
            <span className={`status-dot ${getStatusColor()}`} />
            <span className="thread-key">{post.title}</span>
          </div>
          <div className="compact-row-meta">
            <span className="date-display">{getRelativeTime(post.createdAt)}</span>
            {post.urgent && !isExpired && <span className="bump-badge">URGENT</span>}
            <span className={`status-badge ${getStatusColor()}`}>
              {isExpired ? 'Expired' : getTimeRemaining(post.expiresAt)}
            </span>
          </div>
        </div>
        <div className="expand-icon">{isExpanded ? '−' : '+'}</div>
      </button>

      {isExpanded && (
        <div className="compact-row-expanded">
          <div className="detail-block">
            <div className="detail-label">Category</div>
            <div className="detail-value">
              {getCategoryIcon()} {post.category.toUpperCase()}
            </div>
          </div>

          <div className="detail-block">
            <div className="detail-label">Posted By</div>
            <div className="detail-value from-name">{post.author}</div>
          </div>

          <div className="detail-block">
            <div className="detail-label">Content</div>
            <div className="body-preview">{post.content}</div>
          </div>

          <div className="detail-block detail-inline">
            <div className="detail-label">Status</div>
            <div className="detail-value">
              {isExpired ? (
                <span style={{ color: 'var(--status-closed)' }}>
                  Expired {getRelativeTime(post.expiresAt)}
                </span>
              ) : (
                <span style={{ color: 'var(--status-open)' }}>
                  {getTimeRemaining(post.expiresAt)} remaining
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TempForumPage() {
  const [posts] = useState<Post[]>(MOCK_POSTS);
  const [showExpired, setShowExpired] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [bookmarkedPosts, setBookmarkedPosts] = useState<number[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Load bookmarked posts
    const bookmarks = localStorage.getItem('bookmarkedTempPosts');
    if (bookmarks) {
      setBookmarkedPosts(JSON.parse(bookmarks));
    }
  }, []);

  const handleBookmark = (postId: number) => {
    const newBookmarks = bookmarkedPosts.includes(postId)
      ? bookmarkedPosts.filter(id => id !== postId)
      : [...bookmarkedPosts, postId];

    setBookmarkedPosts(newBookmarks);
    localStorage.setItem('bookmarkedTempPosts', JSON.stringify(newBookmarks));

    // Also save to calendar items
    const post = MOCK_POSTS.find(p => p.id === postId);
    if (post) {
      const calendarItems = JSON.parse(localStorage.getItem('calendarItems') || '[]');
      if (newBookmarks.includes(postId)) {
        calendarItems.push({
          id: `temp-post-${postId}`,
          title: post.title,
          type: 'temp-post',
          date: post.expiresAt.toISOString(),
          link: '/temp-forum',
        });
      } else {
        const filtered = calendarItems.filter((item: any) => item.id !== `temp-post-${postId}`);
        localStorage.setItem('calendarItems', JSON.stringify(filtered));
        return;
      }
      localStorage.setItem('calendarItems', JSON.stringify(calendarItems));
    }
  };

  const activePosts = posts.filter(post => post.expiresAt > currentTime);
  const expiredPosts = posts.filter(post => post.expiresAt <= currentTime);

  const displayPosts = showExpired ? posts : activePosts;
  const filteredPosts = selectedCategory === 'all'
    ? displayPosts
    : displayPosts.filter(post => post.category === selectedCategory);

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    return a.expiresAt.getTime() - b.expiresAt.getTime();
  });

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Temporary Posts</h1>
            <div className="header-stats">
              <div className="stat-pill stat-open">
                <span className="stat-value">{activePosts.length}</span>
                <span className="stat-label">active</span>
              </div>
              <div className="stat-pill stat-total">
                <span className="stat-value">{bookmarkedPosts.length}</span>
                <span className="stat-label">bookmarked</span>
              </div>
              {expiredPosts.length > 0 && (
                <div className="stat-pill stat-total">
                  <span className="stat-value">{expiredPosts.length}</span>
                  <span className="stat-label">expired</span>
                </div>
              )}
            </div>
          </div>
          <p className="dashboard-subtitle">
            Last-minute needs for cast, crew, and props
          </p>
        </div>
      </header>

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{
          display: 'flex',
          gap: 'var(--space-md)',
          alignItems: 'center',
          padding: 'var(--space-md)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)'
        }}>
          <label style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Category:
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '6px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'var(--font-body)'
            }}
          >
            <option value="all">All</option>
            <option value="cast">Cast</option>
            <option value="props">Props</option>
            <option value="crew">Crew</option>
            <option value="misc">Misc</option>
          </select>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            marginLeft: 'auto',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'var(--text-secondary)'
          }}>
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Show expired
          </label>
        </div>
      </div>

      <section
        className="compact-section"
        style={{ '--accent': 'var(--accent-resource)' } as React.CSSProperties}
      >
        <div className="section-header">
          <div className="section-title-row">
            <div className="section-icon">⏰</div>
            <h2 className="section-title">Posts</h2>
            <div className="section-count">{sortedPosts.length}</div>
          </div>
        </div>

        <div className="section-content">
          {sortedPosts.length === 0 ? (
            <div className="section-empty">
              <div className="empty-icon">∅</div>
              <div className="empty-message">No posts found</div>
            </div>
          ) : (
            <div className="row-list">
              {sortedPosts.map((post) => {
                const isBookmarked = bookmarkedPosts.includes(post.id);
                return (
                  <div key={post.id} style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookmark(post.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: 'var(--space-md)',
                        right: 'var(--space-md)',
                        zIndex: 10,
                        padding: 'var(--space-xs) var(--space-sm)',
                        background: isBookmarked ? 'var(--accent-grant)' : 'var(--bg-elevated)',
                        border: `1px solid ${isBookmarked ? 'var(--accent-grant)' : 'var(--border-default)'}`,
                        borderRadius: 'var(--radius-sm)',
                        color: isBookmarked ? 'var(--bg-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '16px',
                        transition: 'all 0.2s ease',
                      }}
                      title={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
                    >
                      {isBookmarked ? '★' : '☆'}
                    </button>
                    <PostRow post={post} currentTime={currentTime} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
