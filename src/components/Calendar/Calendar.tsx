'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isWithinInterval, 
  isBefore,
  addDays,
  subDays
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  StickyNote, 
  ArrowRight, 
  Sun, 
  Moon,
  Clock,
  Flag,
  CheckCircle,
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import styles from './Calendar.module.css';

interface Reminder {
  id: string;
  text: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  time?: string;
}

interface CalendarProps {
  initialDate?: Date;
}

export const Calendar: React.FC<CalendarProps> = ({ initialDate = new Date() }) => {
  const [currentMonth, setCurrentMonth] = useState(initialDate);
  const [selectedRange, setSelectedRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [activeDate, setActiveDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>('');
  const [reminders, setReminders] = useState<Record<string, Reminder[]>>({});
  const [newReminder, setNewReminder] = useState('');
  const [direction, setDirection] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [viewMode, setViewMode] = useState<'month' | 'day' | 'reminders'>('month');
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [reminderFilter, setReminderFilter] = useState<'all' | 'today' | 'scheduled' | 'flagged'>('all');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const goToToday = () => {
    const today = new Date();
    setDirection(today > currentMonth ? 1 : -1);
    setCurrentMonth(today);
    setActiveDate(today);
  };

  const nextMonth = () => {
    setDirection(1);
    if (viewMode === 'month') {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else {
      setActiveDate(addDays(activeDate, 1));
    }
  };
  const prevMonth = () => {
    setDirection(-1);
    if (viewMode === 'month') {
      setCurrentMonth(subMonths(currentMonth, -1));
    } else {
      setActiveDate(subDays(activeDate, -1));
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  useEffect(() => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    const savedNotes = localStorage.getItem(`calendar-notes-${monthKey}`);
    const savedReminders = localStorage.getItem('calendar-reminders');
    
    if (savedNotes) setNotes(savedNotes);
    else setNotes('');

    if (savedReminders) setReminders(JSON.parse(savedReminders));
  }, [currentMonth]);

  useEffect(() => {
    if (Object.keys(reminders).length > 0) {
      localStorage.setItem('calendar-reminders', JSON.stringify(reminders));
    }
  }, [reminders]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    const monthKey = format(currentMonth, 'yyyy-MM');
    localStorage.setItem(`calendar-notes-${monthKey}`, val);
  };

  const handleDateClick = (day: Date) => {
    setActiveDate(day);
    if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
      setSelectedRange({ start: day, end: null });
    } else {
      if (isBefore(day, selectedRange.start)) {
        setSelectedRange({ start: day, end: selectedRange.start });
      } else {
        setSelectedRange({ ...selectedRange, end: day });
      }
    }
  };

  const addReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.trim()) return;

    const dateKey = format(activeDate, 'yyyy-MM-dd');
    
    let time: string | undefined = undefined;
    let text = newReminder;
    
    const timeRegex = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i;
    const match = newReminder.match(timeRegex);
    if (match) {
      let h = parseInt(match[1]);
      const m = match[2] || "00";
      const p = match[3]?.toUpperCase();
      if (p === "PM" && h < 12) h += 12;
      if (p === "AM" && h === 12) h = 0;
      time = `${h.toString().padStart(2, '0')}:${m}`;
      text = newReminder.replace(timeRegex, '').replace(/^[:\s-]+/, '');
    }

    const reminder: Reminder = {
      id: uuidv4(),
      text: text,
      completed: false,
      time: time
    };

    setReminders(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), reminder]
    }));
    setNewReminder('');
  };

  const toggleReminder = (id: string) => {
    const dateKey = format(activeDate, 'yyyy-MM-dd');
    setReminders(prev => ({
      ...prev,
      [dateKey]: prev[dateKey].map(r => r.id === id ? { ...r, completed: !r.completed } : r)
    }));
  };

  const deleteReminder = (id: string) => {
    const dateKey = format(activeDate, 'yyyy-MM-dd');
    setReminders(prev => ({
      ...prev,
      [dateKey]: prev[dateKey].filter(r => r.id !== id)
    }));
  };

  const getRemindersForDate = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return reminders[dateKey] || [];
  };

  const isSelected = (day: Date) => {
    return (
      (selectedRange.start && isSameDay(day, selectedRange.start)) ||
      (selectedRange.end && isSameDay(day, selectedRange.end))
    );
  };

  const isInRange = (day: Date) => {
    if (selectedRange.start && selectedRange.end) {
      return isWithinInterval(day, {
        start: selectedRange.start,
        end: selectedRange.end,
      });
    }
    if (selectedRange.start && hoverDate) {
      const range = isBefore(hoverDate, selectedRange.start)
        ? { start: hoverDate, end: selectedRange.start }
        : { start: selectedRange.start, end: hoverDate };
      return isWithinInterval(day, range);
    }
    return false;
  };

  const getDayClass = (day: Date) => {
    const classes = [styles.dayCell];
    if (!isSameMonth(day, monthStart)) classes.push(styles.empty);
    if (isSameDay(day, new Date())) classes.push(styles.today);
    if (isSelected(day)) classes.push(styles.selected);
    if (isInRange(day)) classes.push(styles.inRange);
    
    if (selectedRange.start && isSameDay(day, selectedRange.start)) classes.push(styles.rangeStart);
    if (selectedRange.end && isSameDay(day, selectedRange.end)) classes.push(styles.rangeEnd);
    
    return classes.join(' ');
  };

  const isHoliday = (day: Date) => {
    const dayOfMonth = day.getDate();
    const month = day.getMonth();
    if (month === 0 && dayOfMonth === 1) return 'New Year\'s Day';
    if (month === 11 && dayOfMonth === 25) return 'Christmas';
    if (dayOfMonth === 15) return 'Mid-Month Review';
    return null;
  };

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.hangingRing} />
      
      <div className={styles.binding}>
        {[...Array(20)].map((_, i) => (
          <div key={i} className={styles.bindingPin} />
        ))}
      </div>

      <header className={styles.hero}>
        <AnimatePresence mode="wait">
          <motion.div
            key={format(currentMonth, 'MMMM')}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6 }}
            className={styles.hero}
          >
            <Image 
              src="/hero.png" 
              alt="Calendar Hero" 
              fill 
              className={styles.heroImage}
              priority
            />
            <div className={styles.heroOverlay}>
              <div>
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className={styles.monthName}
                >
                  {format(currentMonth, 'MMMM')}
                </motion.h1>
                <div className={styles.yearLabel}>{format(currentMonth, 'yyyy')}</div>
              </div>
              <CalendarIcon size={40} strokeWidth={1} />
            </div>
          </motion.div>
        </AnimatePresence>
      </header>

      <main className={styles.contentBody}>
        <section className={styles.gridSection}>
          <div className={styles.gridHeader}>
            <h3>{viewMode === 'month' ? 'Monthly Schedule' : format(activeDate, 'EEEE, d MMMM')}</h3>
            <div className={styles.navButtons}>
              <div className={styles.viewToggle}>
                <button 
                  onClick={() => setViewMode('month')} 
                  className={`${styles.viewBtn} ${viewMode === 'month' ? styles.activeView : ''}`}
                >
                  Month
                </button>
                <button 
                  onClick={() => setViewMode('day')} 
                  className={`${styles.viewBtn} ${viewMode === 'day' ? styles.activeView : ''}`}
                >
                  Day
                </button>
                <button 
                  onClick={() => setViewMode('reminders')} 
                  className={`${styles.viewBtn} ${viewMode === 'reminders' ? styles.activeView : ''}`}
                >
                  Reminders
                </button>
              </div>
              <button 
                onClick={toggleTheme} 
                className={styles.navBtn}
                title="Toggle Theme"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button 
                onClick={goToToday} 
                className={styles.navBtn}
                style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.5rem 0.75rem' }}
              >
                Today
              </button>
              <button onClick={prevMonth} className={styles.navBtn}>
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextMonth} className={styles.navBtn}>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === 'month' ? (
              <motion.div
                key="month"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className={styles.calendarGrid}
              >
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className={styles.dayHeader}>{day}</div>
                ))}
                
                {calendarDays.map((day, i) => {
                  const holiday = isHoliday(day);
                  return (
                    <div
                      key={i}
                      className={`${getDayClass(day)} ${isSameDay(day, activeDate) ? styles.activeDay : ''}`}
                      onClick={() => handleDateClick(day)}
                      onMouseEnter={() => setHoverDate(day)}
                      onMouseLeave={() => setHoverDate(null)}
                    >
                      <span>{format(day, 'd')}</span>
                      <div className={styles.indicatorContainer}>
                        {holiday && isSameMonth(day, monthStart) && (
                          <div className={styles.holidayDot} title={holiday} />
                        )}
                        {getRemindersForDate(day).length > 0 && isSameMonth(day, monthStart) && (
                          <div className={styles.reminderBadge} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : viewMode === 'day' ? (
              <motion.div
                key="day"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={styles.dayViewBody}
              >
                <div className={styles.leftSidebar}>
                  <div className={styles.sidebarGroup}>
                    <label>iCloud</label>
                    <div className={styles.sidebarItem}><div className={`${styles.marker} ${styles.blue}`} /> Home</div>
                    <div className={styles.sidebarItem}><div className={`${styles.marker} ${styles.purple}`} /> Work</div>
                  </div>
                  <div className={styles.sidebarGroup}>
                    <label>Other</label>
                    <div className={styles.sidebarItem}><div className={`${styles.marker} ${styles.red}`} /> Holidays</div>
                    <div className={styles.sidebarItem}><div className={`${styles.marker} ${styles.yellow}`} /> Reminders</div>
                  </div>
                </div>

                <div className={styles.timeGrid}>
                  <div className={styles.allDayRow}>
                    <span className={styles.timeLabel}>all-day</span>
                    <div className={styles.timeSlot}>
                      {isHoliday(activeDate) && (
                        <div className={`${styles.eventChip} ${styles.holidayChip}`}>
                          {isHoliday(activeDate)}
                        </div>
                      )}
                      {getRemindersForDate(activeDate)
                        .filter(r => !r.time)
                        .map(r => (
                          <div key={r.id} className={`${styles.eventChip} ${r.completed ? styles.completedChip : ''}`}>
                            {r.text}
                          </div>
                      ))}
                    </div>
                  </div>

                  {[...Array(15)].map((_, i) => {
                    const hour = i + 7;
                    const hourStr = hour > 12 ? `${hour - 12} PM` : hour === 12 ? 'Noon' : `${hour} AM`;
                    
                    const hourReminders = getRemindersForDate(activeDate).filter(r => {
                      if (!r.time) return false;
                      const rHour = parseInt(r.time.split(':')[0]);
                      return rHour === hour;
                    });

                    return (
                      <div key={hour} className={styles.timeRow}>
                        <span className={styles.timeLabel}>{hourStr}</span>
                        <div 
                          className={styles.timeSlot} 
                          onClick={() => {
                            setNewReminder(`${hourStr}: `);
                          }}
                        >
                          {hourReminders.map(r => (
                            <div key={r.id} className={`${styles.eventChip} ${r.completed ? styles.completedChip : ''}`}>
                              {r.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="reminders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={styles.remindersDashboard}
              >
                <div className={styles.leftSidebar}>
                  <div className={styles.filterTiles}>
                    <div 
                      className={`${styles.tile} ${reminderFilter === 'today' ? styles.activeTile : ''}`}
                      onClick={() => setReminderFilter('today')}
                    >
                      <div className={styles.tileHeader}>
                        <div className={`${styles.tileIcon} ${styles.blueTile}`}><CalendarIcon size={14} /></div>
                        <span className={styles.tileCount}>0</span>
                      </div>
                      <span className={styles.tileLabel}>Today</span>
                    </div>
                    <div 
                      className={`${styles.tile} ${reminderFilter === 'scheduled' ? styles.activeTile : ''}`}
                      onClick={() => setReminderFilter('scheduled')}
                    >
                      <div className={styles.tileHeader}>
                        <div className={`${styles.tileIcon} ${styles.redTile}`}><Clock size={14} /></div>
                        <span className={styles.tileCount}>0</span>
                      </div>
                      <span className={styles.tileLabel}>Scheduled</span>
                    </div>
                    <div 
                      className={`${styles.tile} ${reminderFilter === 'all' ? styles.activeTile : ''}`}
                      onClick={() => setReminderFilter('all')}
                    >
                      <div className={styles.tileHeader}>
                        <div className={`${styles.tileIcon} ${styles.greyTile}`}><Inbox size={14} /></div>
                        <span className={styles.tileCount}>{Object.values(reminders).flat().length}</span>
                      </div>
                      <span className={styles.tileLabel}>All</span>
                    </div>
                    <div 
                      className={`${styles.tile} ${reminderFilter === 'flagged' ? styles.activeTile : ''}`}
                      onClick={() => setReminderFilter('flagged')}
                    >
                      <div className={styles.tileHeader}>
                        <div className={`${styles.tileIcon} ${styles.orangeTile}`}><Flag size={14} /></div>
                        <span className={styles.tileCount}>0</span>
                      </div>
                      <span className={styles.tileLabel}>Flagged</span>
                    </div>
                  </div>
                  
                  <div className={styles.sidebarGroup}>
                    <label>My Lists</label>
                    <div className={styles.sidebarItem}><div className={`${styles.marker} ${styles.yellow}`} /> Reminders</div>
                  </div>
                </div>
                
                <div className={styles.remindersMain}>
                  <h1 className={styles.remindersHeader}>
                    {reminderFilter === 'all' ? 'Reminders' : 
                     reminderFilter.charAt(0).toUpperCase() + reminderFilter.slice(1)}
                  </h1>
                  <div className={styles.remindersSubheader}>
                    <span>{Object.values(reminders).flat().filter(r => r.completed).length} Completed</span>
                    <span>•</span>
                    <button style={{ background: 'none', border: 'none', color: '#ff9f0a', cursor: 'pointer', fontSize: 'inherit' }}>Clear</button>
                  </div>
                  
                  <div className={styles.reminderList}>
                    {Object.values(reminders).flat()
                      .filter(r => {
                        if (reminderFilter === 'all') return true;
                        if (reminderFilter === 'today') return isSameDay(activeDate, new Date());
                        return true;
                      })
                      .map((r) => (
                        <div 
                          key={r.id} 
                          className={`${styles.reminderItem} ${r.id === selectedReminderId ? styles.activeDay : ''}`}
                          onClick={() => setSelectedReminderId(r.id)}
                        >
                          <input 
                            type="checkbox" 
                            checked={r.completed} 
                            onChange={(e) => { e.stopPropagation(); toggleReminder(r.id); }}
                            className={styles.reminderCheckbox}
                          />
                          <div className={styles.reminderText}>
                            <div>{r.text}</div>
                            {r.time && <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{r.time}</div>}
                          </div>
                        </div>
                      ))}
                    <form onSubmit={addReminder} style={{ marginTop: '1rem' }}>
                      <input 
                        type="text" 
                        placeholder="Add Reminder..." 
                        className={styles.reminderInput}
                        value={newReminder}
                        onChange={(e) => setNewReminder(e.target.value)}
                      />
                    </form>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <aside className={styles.sidebar}>
          {viewMode === 'reminders' && selectedReminderId ? (
            <div className={styles.remindersSection}>
              <div className={styles.sidebarHeader}>
                <CheckCircle size={20} className={styles.headerIcon} />
                <h2>Inspector</h2>
              </div>
              <div className={styles.inspectorForm}>
                <div className={styles.inspectorGroup}>
                  <div className={styles.inspectorRow}>
                    <span className={styles.inspectorLabel}><CalendarIcon size={16} /> Date</span>
                    <div className={`${styles.toggleSwitch} ${styles.active}`}><div className={styles.toggleKnob} /></div>
                  </div>
                  <div className={styles.inspectorRow}>
                    <span className={styles.inspectorLabel}><Clock size={16} /> Time</span>
                    <div className={styles.toggleSwitch}><div className={styles.toggleKnob} /></div>
                  </div>
                </div>
                <div className={styles.inspectorGroup}>
                  <div className={styles.inspectorRow}>
                    <span className={styles.inspectorLabel}>Repeat</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Never</span>
                  </div>
                </div>
                <div className={styles.inspectorGroup}>
                    <div className={styles.inspectorRow}>
                      <span className={styles.inspectorLabel}><Flag size={16} /> Flag</span>
                      <div className={styles.toggleSwitch}><div className={styles.toggleKnob} /></div>
                    </div>
                    <div className={styles.inspectorRow}>
                      <span className={styles.inspectorLabel}>Priority</span>
                      <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>None</span>
                    </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.notesSection}>
                <div className={styles.sidebarHeader}>
                  <StickyNote size={20} className={styles.headerIcon} />
                  <h2>Notes</h2>
                </div>
                <textarea
                  className={styles.notesArea}
                  placeholder="Add monthly notes..."
                  value={notes}
                  onChange={handleNotesChange}
                />
              </div>

              <div className={styles.remindersSection}>
                <div className={styles.sidebarHeader}>
                  <CalendarIcon size={20} className={styles.headerIcon} />
                  <h2>Details & Reminders</h2>
                </div>
                
                <div className={styles.reminderList}>
                  <div className={styles.dateLabel}>{format(activeDate, 'EEEE, d MMMM')}</div>
                  {getRemindersForDate(activeDate).length > 0 ? (
                    getRemindersForDate(activeDate).map((r) => (
                      <div key={r.id} className={`${styles.reminderItem} ${r.completed ? styles.completed : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={r.completed} 
                          onChange={() => toggleReminder(r.id)}
                          className={styles.reminderCheckbox}
                        />
                        <span className={styles.reminderText}>{r.text}</span>
                        <button onClick={() => deleteReminder(r.id)} className={styles.deleteBtn}>×</button>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyReminders}>No reminders for today</div>
                  )}
                </div>

                <form onSubmit={addReminder} className={styles.reminderForm}>
                  <input 
                    type="text" 
                    placeholder="New reminder..." 
                    value={newReminder}
                    onChange={(e) => setNewReminder(e.target.value)}
                    className={styles.reminderInput}
                  />
                </form>
              </div>
            </>
          )}
        </aside>
      </main>

      <footer className={styles.footer}>
        {selectedRange.start ? (
          <>
            <div className={styles.rangeSummary}>
              <CalendarIcon size={14} />
              <span>{format(selectedRange.start, 'MMM d, yyyy')}</span>
              {selectedRange.end && (
                <>
                  <ArrowRight size={14} />
                  <span>{format(selectedRange.end, 'MMM d, yyyy')}</span>
                </>
              )}
              {!selectedRange.end && hoverDate && !isSameDay(hoverDate, selectedRange.start) && (
                <>
                  <ArrowRight size={14} style={{ opacity: 0.5 }} />
                  <span style={{ opacity: 0.5 }}>{format(hoverDate, 'MMM d, yyyy')}</span>
                </>
              )}
            </div>
            <button 
              className={styles.clearBtn}
              onClick={() => setSelectedRange({ start: null, end: null })}
            >
              Clear
            </button>
          </>
        ) : (
          <span style={{ opacity: 0.6 }}>Select a date range to begin</span>
        )}
      </footer>
    </div>
  );
};
