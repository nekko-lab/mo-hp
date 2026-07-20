'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Activity } from './types';

type Props = {
  activities: Activity[];
  tags: string[];
};

function MarkdownContent({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        color: 'var(--color-text-secondary)',
        fontSize: '0.95rem',
        lineHeight: 1.85,
      }}
    >
      {blocks.map((block, index) => {
        const trimmed = block.trim();

        if (trimmed.startsWith('## ')) {
          return (
            <h3
              key={index}
              style={{
                color: 'var(--color-text-primary)',
                fontSize: '1.25rem',
                fontWeight: 800,
                lineHeight: 1.45,
                marginTop: index === 0 ? 0 : '0.75rem',
              }}
            >
              {trimmed.replace(/^## /, '')}
            </h3>
          );
        }

        if (trimmed.startsWith('- ')) {
          return (
            <ul
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                paddingLeft: '1.25rem',
              }}
            >
              {trimmed.split('\n').map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}-${item}`}>{item.replace(/^- /, '')}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} style={{ whiteSpace: 'pre-line' }}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

function TagBadge({ tag, color }: { tag: string; color: string }) {
  return (
    <span
      style={{
        padding: '0.25rem 0.6rem',
        borderRadius: '6px',
        fontSize: '0.72rem',
        fontWeight: 700,
        background: `${color}18`,
        color,
        lineHeight: 1.2,
      }}
    >
      {tag}
    </span>
  );
}

function TitleLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      width="0.72em"
      height="0.72em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: '0 0 auto', transform: 'translateY(0.04em)' }}
    >
      <path d="M7 17L17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}

export default function ActivitiesClient({ activities, tags }: Props) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const filteredActivities = useMemo(() => {
    if (selectedTags.length === 0) {
      return activities;
    }

    return activities.filter((activity) =>
      selectedTags.every((tag) => activity.tags.includes(tag)),
    );
  }, [activities, selectedTags]);

  useEffect(() => {
    if (!selectedActivity) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedActivity(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedActivity]);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  };

  return (
    <>
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem 1rem' }}>
        <div
          className="glass"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            padding: '1rem',
            borderRadius: '16px',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              aria-pressed={selectedTags.length === 0}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '999px',
                border:
                  selectedTags.length === 0
                    ? '1px solid transparent'
                    : '1px solid rgba(57, 197, 187, 0.22)',
                background:
                  selectedTags.length === 0
                    ? 'linear-gradient(135deg, #39C5BB, #2ab5ac)'
                    : 'rgba(255, 255, 255, 0.45)',
                color: selectedTags.length === 0 ? '#fff' : 'var(--color-text-secondary)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              すべて
            </button>
            {tags.map((tag) => {
              const selected = selectedTags.includes(tag);

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={selected}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '999px',
                    border: selected
                      ? '1px solid transparent'
                      : '1px solid rgba(57, 197, 187, 0.22)',
                    background: selected
                      ? 'linear-gradient(135deg, #1a1a2e, #39C5BB)'
                      : 'rgba(255, 255, 255, 0.45)',
                    color: selected ? '#fff' : 'var(--color-text-secondary)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            {filteredActivities.length}件
          </span>
        </div>
      </section>

      <section className="section" style={{ paddingTop: '1.5rem' }}>
        {filteredActivities.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {filteredActivities.map((activity) => (
              <button
                key={activity.slug}
                type="button"
                onClick={() => setSelectedActivity(activity)}
                className="glass card-hover"
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border-glass)',
                  cursor: 'pointer',
                  padding: 0,
                  textAlign: 'left',
                  color: 'inherit',
                  background: 'var(--color-bg-glass)',
                }}
              >
                <div
                  style={{
                    minHeight: '150px',
                    padding: '1.5rem',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    background: `linear-gradient(135deg, ${activity.color}26, rgba(255,255,255,0.6))`,
                  }}
                >
                  <span
                    style={{
                      color: activity.color,
                      fontSize: '2.3rem',
                      fontWeight: 900,
                      lineHeight: 1,
                      letterSpacing: 0,
                    }}
                  >
                    {activity.coverIcon}
                  </span>
                  <span
                    style={{
                      color: 'var(--color-text-muted)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}
                  >
                    {activity.date}
                  </span>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <h2
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      lineHeight: 1.45,
                      marginBottom: '0.75rem',
                    }}
                  >
                    {activity.title}
                  </h2>
                  <p
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.86rem',
                      lineHeight: 1.7,
                      minHeight: '4.3rem',
                      marginBottom: '1rem',
                    }}
                  >
                    {activity.summary}
                  </p>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {activity.tags.map((tag) => (
                      <TagBadge key={tag} tag={tag} color={activity.color} />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div
            className="glass"
            style={{
              maxWidth: '640px',
              margin: '0 auto',
              padding: '2.5rem 2rem',
              borderRadius: '16px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            選択したタグに一致する活動実績はありません。
          </div>
        )}
      </section>

      {selectedActivity && (
        <div
          role="presentation"
          onClick={() => setSelectedActivity(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            background: 'rgba(26, 26, 46, 0.45)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <article
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-modal-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(860px, 100%)',
              maxHeight: 'min(760px, calc(100vh - 3rem))',
              overflow: 'auto',
              borderRadius: '18px',
              background: 'var(--color-bg-card)',
              boxShadow: '0 24px 80px rgba(26,26,46,0.24)',
            }}
          >
            <div
              style={{
                padding: '2rem',
                background: `linear-gradient(135deg, ${selectedActivity.color}26, rgba(255,255,255,0.75))`,
                borderBottom: '1px solid rgba(57, 197, 187, 0.14)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <span
                  style={{
                    color: selectedActivity.color,
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {selectedActivity.coverIcon}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedActivity(null)}
                  aria-label="閉じる"
                  autoFocus
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '1px solid rgba(26,26,46,0.12)',
                    background: 'rgba(255,255,255,0.72)',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
              <div
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                }}
              >
                {selectedActivity.date}
              </div>
              <h2
                id="activity-modal-title"
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: 'clamp(1.55rem, 4vw, 2.35rem)',
                  fontWeight: 900,
                  lineHeight: 1.25,
                  marginBottom: '1rem',
                }}
              >
                {selectedActivity.url ? (
                  <a
                    href={selectedActivity.url}
                    style={{
                      color: 'inherit',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'baseline',
                      gap: '0.45rem',
                    }}
                  >
                    <span>{selectedActivity.title}</span>
                    <TitleLinkIcon />
                  </a>
                ) : (
                  selectedActivity.title
                )}
              </h2>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                {selectedActivity.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} color={selectedActivity.color} />
                ))}
              </div>
            </div>

            <div style={{ padding: '2rem' }}>
              <MarkdownContent markdown={selectedActivity.body} />
            </div>
          </article>
        </div>
      )}
    </>
  );
}
