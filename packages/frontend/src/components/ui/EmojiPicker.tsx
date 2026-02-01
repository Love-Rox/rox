"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Smile, X, Sparkles, Loader2, ChevronDown } from "lucide-react";
import { Button } from "./Button";
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  Button as AriaButton,
  type Key,
} from "react-aria-components";
import { getModalContainer } from "../../lib/utils/modalContainer";
import {
  emojiListAtom,
  emojiCategoriesAtom,
  emojisByCategoryAtom,
  emojiLoadingAtom,
  fetchEmojisAtom,
  type CustomEmoji,
} from "../../lib/atoms/customEmoji";
import { getProxiedImageUrl } from "../../lib/utils/imageProxy";
import {
  EMOJI_CATEGORIES,
  RECENT_EMOJIS_KEY,
  MAX_RECENT_EMOJIS,
  type EmojiCategory,
} from "./emojiData";

/**
 * Number of emojis to render per page for virtualization
 */
const EMOJIS_PER_PAGE = 50;

/**
 * Normalize category name for display, replacing sentinel values
 */
function normalizeCategoryName(name: string): string {
  if (name === "__uncategorized__" || name === "") {
    return t`Uncategorized`;
  }
  return name;
}

/**
 * Props for the EmojiPicker component
 */
export interface EmojiPickerProps {
  /**
   * Callback when an emoji is selected
   */
  onEmojiSelect: (emoji: string) => void;
  /**
   * Trigger button for the picker
   */
  trigger?: React.ReactNode;
  /**
   * Whether the picker is disabled
   */
  isDisabled?: boolean;
}

/**
 * Props for the accordion section component
 */
interface AccordionSectionProps {
  /** Category key (used as Disclosure id) */
  categoryKey: string;
  /** Section title */
  title: string;
  /** Section icon */
  icon: React.ReactNode;
  /** Emojis to display */
  emojis: readonly string[];
  /** Callback when emoji is clicked */
  onEmojiClick: (emoji: string) => void;
  /** Number of visible emojis */
  visibleCount: number;
  /** Whether there are more emojis */
  hasMore: boolean;
}

/**
 * Accordion section for emoji category using React Aria Disclosure
 */
function AccordionSection({
  categoryKey,
  title,
  icon,
  emojis,
  onEmojiClick,
  visibleCount,
  hasMore,
}: AccordionSectionProps) {
  const displayedEmojis = emojis.slice(0, visibleCount);

  return (
    <Disclosure id={categoryKey} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      {({ isExpanded }) => (
        <>
          <AriaButton
            slot="trigger"
            className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{icon}</span>
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{title}</span>
              <span className="text-xs text-gray-400">({emojis.length})</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </AriaButton>
          <DisclosurePanel className="px-3 pb-2">
            <div className="grid grid-cols-8 gap-0.5">
              {displayedEmojis.map((emoji, index) => (
                <Button
                  key={`${emoji}-${index}`}
                  onPress={() => onEmojiClick(emoji)}
                  className="text-xl p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label={`Select ${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
            {hasMore && (
              <div className="text-center py-1.5 text-xs text-gray-400">
                {displayedEmojis.length}/{emojis.length}
              </div>
            )}
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  );
}

/**
 * Props for the custom emoji accordion section
 */
interface CustomAccordionSectionProps {
  /** Category key (used as Disclosure id) */
  categoryKey: string;
  /** Section title */
  title: string;
  /** Section icon */
  icon: React.ReactNode;
  /** Custom emojis to display */
  emojis: CustomEmoji[];
  /** Callback when emoji is clicked */
  onEmojiClick: (emoji: CustomEmoji) => void;
  /** Number of visible emojis */
  visibleCount: number;
  /** Whether there are more emojis */
  hasMore: boolean;
}

/**
 * Accordion section for custom emoji category using React Aria Disclosure
 */
function CustomAccordionSection({
  categoryKey,
  title,
  icon,
  emojis,
  onEmojiClick,
  visibleCount,
  hasMore,
}: CustomAccordionSectionProps) {
  const displayedEmojis = emojis.slice(0, visibleCount);

  return (
    <Disclosure id={categoryKey} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      {({ isExpanded }) => (
        <>
          <AriaButton
            slot="trigger"
            className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{icon}</span>
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{title}</span>
              <span className="text-xs text-gray-400">({emojis.length})</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </AriaButton>
          <DisclosurePanel className="px-3 pb-2">
            <div className="grid grid-cols-8 gap-0.5">
              {displayedEmojis.map((emoji) => (
                <Button
                  key={emoji.id}
                  onPress={() => onEmojiClick(emoji)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label={`Select :${emoji.name}:`}
                >
                  <img
                    src={getProxiedImageUrl(emoji.url) || ""}
                    alt={`:${emoji.name}:`}
                    className="w-5 h-5 object-contain"
                    loading="lazy"
                  />
                </Button>
              ))}
            </div>
            {hasMore && (
              <div className="text-center py-1.5 text-xs text-gray-400">
                {displayedEmojis.length}/{emojis.length}
              </div>
            )}
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  );
}

/**
 * Emoji picker component with accordion-style categories
 *
 * Features:
 * - Accordion-based category navigation (mobile-friendly, no horizontal scroll)
 * - Recently used emojis
 * - Search functionality
 * - Keyboard navigation
 * - Custom emoji support
 *
 * @example
 * ```tsx
 * <EmojiPicker
 *   onEmojiSelect={(emoji) => console.log('Selected:', emoji)}
 * />
 * ```
 */
export function EmojiPicker({ onEmojiSelect, trigger, isDisabled }: EmojiPickerProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(new Set(["smileys"]));
  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Custom emoji state
  const customEmojis = useAtomValue(emojiListAtom);
  const customCategories = useAtomValue(emojiCategoriesAtom);
  const emojisByCategory = useAtomValue(emojisByCategoryAtom);
  const isLoadingEmojis = useAtomValue(emojiLoadingAtom);
  const fetchEmojis = useSetAtom(fetchEmojisAtom);

  // Load recent emojis from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
      if (stored) {
        setRecentEmojis(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load recent emojis:", error);
    }
  }, []);

  // Fetch custom emojis on mount
  useEffect(() => {
    fetchEmojis();
  }, [fetchEmojis]);

  // Reset visible counts when search changes
  useEffect(() => {
    setVisibleCounts({});
  }, [searchQuery]);

  // Get visible count for a category
  const getVisibleCount = useCallback(
    (categoryKey: string) => visibleCounts[categoryKey] || EMOJIS_PER_PAGE,
    [visibleCounts],
  );

  // Increment visible count for a category
  const loadMore = useCallback((categoryKey: string, total: number) => {
    setVisibleCounts((prev) => ({
      ...prev,
      [categoryKey]: Math.min((prev[categoryKey] || EMOJIS_PER_PAGE) + EMOJIS_PER_PAGE, total),
    }));
  }, []);

  // Handle scroll to load more
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      // Load more search results if in search mode
      if (searchQuery.trim()) {
        // Load more for both search result categories
        loadMore("search-custom", customEmojis.length);
        loadMore("search-unicode", Object.values(EMOJI_CATEGORIES).reduce((sum, cat) => sum + cat.emojis.length, 0));
        return;
      }
      // Otherwise load more for expanded categories
      for (const key of expandedKeys) {
        const expandedCategory = String(key);
        if (expandedCategory === "custom") {
          loadMore("custom", customEmojis.length);
        } else if (expandedCategory.startsWith("custom-")) {
          const catName = expandedCategory.replace("custom-", "");
          const emojis = emojisByCategory.get(catName === "__uncategorized__" ? "" : catName) || [];
          loadMore(expandedCategory, emojis.length);
        } else if (expandedCategory === "recent") {
          loadMore("recent", recentEmojis.length);
        } else if (expandedCategory in EMOJI_CATEGORIES) {
          loadMore(expandedCategory, EMOJI_CATEGORIES[expandedCategory as EmojiCategory].emojis.length);
        }
      }
    }
  }, [expandedKeys, customEmojis.length, emojisByCategory, recentEmojis.length, loadMore, searchQuery]);

  // Save emoji to recent emojis
  const saveToRecent = useCallback((emoji: string) => {
    try {
      setRecentEmojis((prev) => {
        const updated = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, MAX_RECENT_EMOJIS);
        localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error("Failed to save recent emoji:", error);
    }
  }, []);

  const handleEmojiClick = useCallback(
    (emoji: string) => {
      saveToRecent(emoji);
      onEmojiSelect(emoji);
      setIsOpen(false);
    },
    [saveToRecent, onEmojiSelect],
  );

  // Handle custom emoji click (inserts :name: format)
  const handleCustomEmojiClick = useCallback(
    (emoji: CustomEmoji) => {
      const emojiCode = `:${emoji.name}:`;
      saveToRecent(emojiCode);
      onEmojiSelect(emojiCode);
      setIsOpen(false);
    },
    [saveToRecent, onEmojiSelect],
  );

  // Filter emojis by search query
  const searchResults = useMemo(() => {
    if (!searchQuery) return null;

    const query = searchQuery.toLowerCase();
    const unicodeResults: string[] = [];
    const customResults: CustomEmoji[] = [];

    // Search in all Unicode categories
    for (const category of Object.values(EMOJI_CATEGORIES)) {
      for (const emoji of category.emojis) {
        if (emoji.includes(searchQuery)) {
          unicodeResults.push(emoji);
        }
      }
    }

    // Search in custom emojis
    for (const emoji of customEmojis) {
      if (
        emoji.name.toLowerCase().includes(query) ||
        emoji.aliases.some((alias) => alias.toLowerCase().includes(query))
      ) {
        customResults.push(emoji);
      }
    }

    return { unicodeResults, customResults };
  }, [searchQuery, customEmojis]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      {trigger || (
        <Button
          variant="ghost"
          size="sm"
          isDisabled={isDisabled}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Add emoji"
        >
          <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Button>
      )}
      <ModalOverlay className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
        <Modal
          UNSTABLE_portalContainer={getModalContainer()}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden mx-4"
        >
          <Dialog className="flex flex-col h-full min-h-0 outline-none">
            {({ close }) => (
              <>
                {/* Header */}
                <div className="shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      <Trans>Emoji Picker</Trans>
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={close}
                      className="p-1 rounded-md"
                      aria-label={t`Close`}
                    >
                      <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </Button>
                  </div>

                  {/* Search */}
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t`Search emoji...`}
                    aria-label={t`Search emoji`}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded focus:outline-none focus:ring-1 focus:ring-primary-400 text-sm"
                  />
                </div>

                {/* Content */}
                <div
                  ref={scrollContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto"
                  onScroll={handleScroll}
                >
                  {/* Search Results */}
                  {searchResults && (
                    <div className="p-3">
                      {/* Custom emoji search results */}
                      {searchResults.customResults.length > 0 && (
                        <div className="mb-3">
                          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                            <Trans>Custom Emojis</Trans>
                            <span className="ml-1">({searchResults.customResults.length})</span>
                          </h3>
                          <div className="grid grid-cols-8 gap-0.5">
                            {searchResults.customResults.slice(0, getVisibleCount("search-custom")).map((emoji) => (
                              <Button
                                key={emoji.id}
                                onPress={() => handleCustomEmojiClick(emoji)}
                                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label={`Select :${emoji.name}:`}
                              >
                                <img
                                  src={getProxiedImageUrl(emoji.url) || ""}
                                  alt={`:${emoji.name}:`}
                                  className="w-5 h-5 object-contain"
                                  loading="lazy"
                                />
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Unicode emoji search results */}
                      {searchResults.unicodeResults.length > 0 && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                            <Trans>Standard Emojis</Trans>
                            <span className="ml-1">({searchResults.unicodeResults.length})</span>
                          </h3>
                          <div className="grid grid-cols-8 gap-0.5">
                            {searchResults.unicodeResults.slice(0, getVisibleCount("search-unicode")).map((emoji, index) => (
                              <Button
                                key={`${emoji}-${index}`}
                                onPress={() => handleEmojiClick(emoji)}
                                className="text-xl p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label={`Select ${emoji}`}
                              >
                                {emoji}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty search state */}
                      {searchResults.customResults.length === 0 && searchResults.unicodeResults.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
                          <Smile className="w-10 h-10 mb-2" />
                          <p className="text-sm">
                            <Trans>No emojis found</Trans>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Accordion Categories */}
                  {!searchResults && (
                    <DisclosureGroup
                      expandedKeys={expandedKeys}
                      onExpandedChange={setExpandedKeys}
                    >
                      {/* Loading state for custom emojis */}
                      {isLoadingEmojis && (
                        <div className="flex items-center justify-center py-3">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      )}

                      {/* Custom emojis section */}
                      {customEmojis.length > 0 && (
                        <CustomAccordionSection
                          categoryKey="custom"
                          title={t`Custom Emojis`}
                          icon={<Sparkles className="w-4 h-4" />}
                          emojis={customEmojis}
                          onEmojiClick={handleCustomEmojiClick}
                          visibleCount={getVisibleCount("custom")}
                          hasMore={getVisibleCount("custom") < customEmojis.length}
                        />
                      )}

                      {/* Custom emoji sub-categories */}
                      {customCategories.length > 0 &&
                        customCategories.map((catName) => {
                          const catEmojis = emojisByCategory.get(catName) || [];
                          const categoryKey = `custom-${catName}`;
                          const displayName = normalizeCategoryName(catName);
                          const firstEmoji = catEmojis[0];
                          return (
                            <CustomAccordionSection
                              key={categoryKey}
                              categoryKey={categoryKey}
                              title={displayName}
                              icon={
                                firstEmoji ? (
                                  <img
                                    src={getProxiedImageUrl(firstEmoji.url) || ""}
                                    alt={catName}
                                    className="w-4 h-4 object-contain"
                                  />
                                ) : (
                                  <span className="text-base">📦</span>
                                )
                              }
                              emojis={catEmojis}
                              onEmojiClick={handleCustomEmojiClick}
                              visibleCount={getVisibleCount(categoryKey)}
                              hasMore={getVisibleCount(categoryKey) < catEmojis.length}
                            />
                          );
                        })}

                      {/* Recent emojis section */}
                      {recentEmojis.length > 0 && (
                        <AccordionSection
                          categoryKey="recent"
                          title={EMOJI_CATEGORIES.recent.name}
                          icon={EMOJI_CATEGORIES.recent.icon}
                          emojis={recentEmojis}
                          onEmojiClick={handleEmojiClick}
                          visibleCount={getVisibleCount("recent")}
                          hasMore={getVisibleCount("recent") < recentEmojis.length}
                        />
                      )}

                      {/* Standard emoji categories */}
                      {(Object.keys(EMOJI_CATEGORIES) as EmojiCategory[])
                        .filter((cat) => cat !== "recent")
                        .map((category) => (
                          <AccordionSection
                            key={category}
                            categoryKey={category}
                            title={EMOJI_CATEGORIES[category].name}
                            icon={EMOJI_CATEGORIES[category].icon}
                            emojis={EMOJI_CATEGORIES[category].emojis}
                            onEmojiClick={handleEmojiClick}
                            visibleCount={getVisibleCount(category)}
                            hasMore={getVisibleCount(category) < EMOJI_CATEGORIES[category].emojis.length}
                          />
                        ))}
                    </DisclosureGroup>
                  )}
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
