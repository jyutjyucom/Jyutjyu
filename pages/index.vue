<template>
    <div
        class="min-h-screen bg-parchment dark:bg-stone-950 selection:bg-kapok-container selection:text-kapok"
    >
        <!-- Top bar -->
        <div
            class="max-w-7xl mx-auto px-6 flex justify-end items-center gap-4 pt-5 pb-2"
        >
            <ThemeToggle />
            <LanguageSwitcher />
        </div>

        <main id="main-content">
            <!-- Hero Section -->
            <section
                class="relative min-h-[580px] md:min-h-[680px] flex flex-col items-center justify-center px-6 pt-16 pb-28 overflow-hidden"
            >
                <!-- Background watermark character -->
                <div
                    class="absolute inset-0 z-0 opacity-[0.03] pointer-events-none select-none flex items-center justify-center"
                >
                    <span
                        class="text-[28rem] md:text-[40rem] font-headline text-kapok leading-none"
                        >辭</span
                    >
                </div>

                <div class="relative z-10 text-center max-w-3xl mx-auto">
                    <h1
                        class="text-5xl md:text-7xl lg:text-8xl font-headline text-ink dark:text-stone-100 mb-5 tracking-tighter"
                    >
                        {{ t("common.siteName") }}
                    </h1>
                    <!-- Decorative divider -->
                    <div class="flex items-center justify-center gap-4 mb-6">
                        <div class="h-px w-12 bg-kapok/30"></div>
                        <div class="w-1.5 h-1.5 rounded-full bg-kapok"></div>
                        <div class="h-px w-12 bg-kapok/30"></div>
                    </div>
                    <p
                        class="text-xl md:text-2xl text-ink dark:text-parchment font-serif font-light max-w-xl mx-auto leading-relaxed"
                    >
                        {{ t("common.siteSubtitle") }}
                    </p>
                    <p
                        class="text-lg md:text-xl text-ink/80 dark:text-parchment/80 font-serif mb-12 max-w-xl mx-auto"
                    >
                        {{ t("common.siteDescription") }}
                    </p>

                    <!-- Search Bar -->
                    <div class="w-full max-w-4xl mx-auto group">
                        <div
                            class="relative flex items-center bg-white dark:bg-stone-900 overflow-hidden transition-colors duration-300"
                        >
                            <!-- Search icon -->
                            <svg
                                class="absolute left-5 w-5 h-5 text-graphite/50 group-focus-within:text-kapok transition-colors"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <input
                                v-model="searchQuery"
                                type="text"
                                :placeholder="t('common.searchPlaceholder')"
                                class="w-full py-5 pl-14 pr-36 bg-transparent border-none focus:outline-none focus:ring-0 text-ink dark:text-stone-100 placeholder:text-graphite/40 dark:placeholder:text-stone-600 text-lg"
                                @keyup.enter="handleSearch"
                            />
                            <div
                                class="absolute right-3 flex items-center gap-2"
                            >
                                <button
                                    class="bg-kapok text-white px-5 py-2.5 font-medium text-base hover:bg-kapok/90 transition-colors"
                                    @click="handleSearch"
                                >
                                    {{ t("common.searchButton") }}
                                </button>
                            </div>
                        </div>
                        <!-- Example badges + reverse toggle -->
                        <div
                            class="mt-4 flex flex-wrap justify-center items-center gap-3"
                        >
                            <template v-if="enableReverseSearch">
                                <button
                                    class="px-3 py-1 bg-surface-low dark:bg-stone-800 rounded-full text-xs text-ink dark:text-stone-100 hover:bg-archive-green/10 hover:text-archive-green dark:hover:bg-archive-green/20 dark:hover:text-archive-green transition-colors"
                                    @click="searchExample('為什麼')"
                                >
                                    為什麼
                                </button>
                                <button
                                    class="px-3 py-1 bg-surface-low dark:bg-stone-800 rounded-full text-xs text-ink dark:text-stone-100 hover:bg-archive-green/10 hover:text-archive-green dark:hover:bg-archive-green/20 dark:hover:text-archive-green transition-colors"
                                    @click="searchExample('奇怪')"
                                >
                                    奇怪
                                </button>
                            </template>
                            <template v-else>
                                <button
                                    class="px-3 py-1 bg-surface-low dark:bg-stone-800 rounded-full text-xs text-ink dark:text-stone-100 hover:bg-archive-green/10 hover:text-archive-green dark:hover:bg-archive-green/20 dark:hover:text-archive-green transition-colors"
                                    @click="searchExample('阿Sir')"
                                >
                                    阿Sir
                                </button>
                                <button
                                    class="px-3 py-1 bg-surface-low dark:bg-stone-800 rounded-full text-xs text-ink dark:text-stone-100 hover:bg-archive-green/10 hover:text-archive-green dark:hover:bg-archive-green/20 dark:hover:text-archive-green transition-colors"
                                    @click="searchExample('aa3 soe4')"
                                >
                                    aa3 soe4
                                </button>
                            </template>
                            <label
                                class="flex items-center gap-2 cursor-pointer select-none ml-2"
                                :title="t('common.reverseSearchTitle')"
                            >
                                <input
                                    v-model="enableReverseSearch"
                                    type="checkbox"
                                    class="w-4 h-4 text-kapok bg-white dark:bg-stone-800 border border-outline-soft dark:border-stone-600 rounded focus:ring-kapok/40"
                                />
                                <span
                                    class="text-base text-ink dark:text-stone-100"
                                    >{{ t("common.reverseSearch") }}</span
                                >
                            </label>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Featured Entries Section (Asymmetric Grid) -->
            <section class="max-w-7xl mx-auto px-6 py-4 sm:py-20">
                <div
                    class="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-14 gap-4"
                >
                    <div>
                        <h2
                            class="text-3xl md:text-4xl font-headline text-ink dark:text-stone-100"
                        >
                            {{ t("common.recommendedEntries") }}
                        </h2>
                    </div>
                    <button
                        @click="refreshRandomEntries"
                        :disabled="loadingRandomEntries"
                        class="text-kapok font-semibold flex items-center gap-2 hover:underline underline-offset-8 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg
                            v-if="loadingRandomEntries"
                            class="w-4 h-4 animate-spin"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        {{ t("common.changeBatch") }}
                        <svg
                            v-if="!loadingRandomEntries"
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </button>
                </div>

                <!-- Loading state -->
                <div
                    v-if="loadingRandomEntries && randomEntries.length > 0"
                    class="text-center py-16"
                >
                    <div
                        class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-kapok border-t-transparent"
                    ></div>
                    <p class="text-graphite dark:text-stone-200 mt-4 text-sm">
                        {{ t("common.loading") }}
                    </p>
                </div>

                <!-- Desktop: Asymmetric grid (1 large + 2 small) -->
                <div
                    v-if="!loadingRandomEntries && randomEntries.length > 0"
                    class="hidden md:grid md:grid-cols-12 gap-8"
                >
                    <!-- Large Featured Card (first entry) -->
                    <NuxtLink
                        v-if="featuredEntry"
                        :to="wordPath(featuredEntry.headword.display)"
                        :prefetch="false"
                        @click="navigatingToId = featuredEntry.id"
                        class="md:col-span-7 bg-surface-low dark:bg-stone-900 p-10 lg:p-14 flex flex-col justify-between group cursor-pointer hover:bg-surface-high dark:hover:bg-stone-800 transition-colors duration-500 relative overflow-hidden"
                    >
                        <!-- Loading overlay -->
                        <div
                            v-if="navigatingToId === featuredEntry.id"
                            class="absolute inset-0 bg-parchment/80 dark:bg-stone-900/80 flex items-center justify-center z-10"
                        >
                            <div
                                class="animate-spin w-8 h-8 border-2 border-kapok border-t-transparent rounded-full"
                            ></div>
                        </div>

                        <div>
                            <h3
                                class="text-5xl lg:text-7xl xl:text-8xl font-headline text-ink dark:text-stone-100 mb-6 group-hover:text-kapok transition-colors duration-700 mt-6 break-words"
                            >
                                {{ featuredEntry.headword.display }}
                            </h3>
                            <div class="flex items-center gap-4 mb-6">
                                <span
                                    class="text-2xl text-kapok font-semibold"
                                    >{{
                                        featuredEntry.phonetic.jyutping[0]
                                    }}</span
                                >
                            </div>
                            <p
                                class="text-lg text-ink/80 dark:text-stone-200 leading-relaxed max-w-md line-clamp-4"
                            >
                                {{
                                    featuredEntry.senses[0]?.definition ||
                                    t("common.noDefinition")
                                }}
                            </p>
                        </div>

                        <div
                            class="mt-14 pt-6 border-t border-outline-soft/10 dark:border-stone-800 flex items-center justify-between"
                        >
                            <span
                                class="text-sm text-graphite/60 dark:text-stone-200 font-medium"
                            >
                                {{ featuredEntry.source_book }}
                            </span>
                            <svg
                                class="w-5 h-5 text-kapok group-hover:translate-x-2 transition-transform"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M7 17L17 7M17 7H7M17 7v10"
                                />
                            </svg>
                        </div>
                    </NuxtLink>

                    <!-- Secondary Cards Stack -->
                    <div class="md:col-span-5 grid grid-cols-1 gap-8">
                        <NuxtLink
                            v-for="entry in secondaryEntries"
                            :key="entry.id"
                            :to="wordPath(entry.headword.display)"
                            :prefetch="false"
                            @click="navigatingToId = entry.id"
                            class="bg-white dark:bg-stone-900 border border-outline-soft/10 dark:border-stone-800 p-8 flex gap-8 items-center hover:border-kapok/30 hover:bg-kapok-container/30 dark:hover:bg-kapok/5 transition-all duration-300 relative overflow-hidden"
                        >
                            <!-- Loading overlay -->
                            <div
                                v-if="navigatingToId === entry.id"
                                class="absolute inset-0 bg-white/80 dark:bg-stone-900/80 flex items-center justify-center z-10"
                            >
                                <div
                                    class="animate-spin w-6 h-6 border-2 border-kapok border-t-transparent rounded-full"
                                ></div>
                            </div>

                            <div
                                class="text-4xl font-headline text-ink dark:text-stone-100 shrink-0 max-w-[45%] break-words leading-tight"
                            >
                                {{ entry.headword.display }}
                            </div>
                            <div class="min-w-0">
                                <span
                                    class="text-base text-kapok font-semibold tracking-widest block mb-1"
                                >
                                    {{ entry.phonetic.jyutping[0] }}
                                </span>
                                <h3
                                    class="text-lg font-bold text-ink dark:text-stone-100 mb-2"
                                >
                                    {{
                                        entry.senses[0]?.definition ||
                                        t("common.noDefinition")
                                    }}
                                </h3>
                                <p
                                    class="text-sm text-graphite/60 dark:text-stone-200 font-medium"
                                >
                                    {{ entry.source_book }}
                                </p>
                            </div>
                        </NuxtLink>
                    </div>
                </div>

                <!-- Mobile: 1 card at a time -->
                <div
                    v-if="!loadingRandomEntries && currentMobileEntry"
                    class="md:hidden"
                >
                    <NuxtLink
                        :to="wordPath(currentMobileEntry.headword.display)"
                        :prefetch="false"
                        @click="navigatingToId = currentMobileEntry.id"
                        class="block bg-surface-low dark:bg-stone-900 p-8 active:bg-surface-high dark:active:bg-stone-800 transition-colors relative overflow-hidden"
                    >
                        <!-- Loading overlay -->
                        <div
                            v-if="navigatingToId === currentMobileEntry.id"
                            class="absolute inset-0 bg-parchment/80 dark:bg-stone-900/80 flex items-center justify-center z-10"
                        >
                            <div
                                class="animate-spin w-6 h-6 border-2 border-kapok border-t-transparent rounded-full"
                            ></div>
                        </div>
                        <div class="text-center">
                            <h3
                                class="text-5xl font-headline text-ink dark:text-stone-100 mb-4"
                            >
                                {{ currentMobileEntry.headword.display }}
                            </h3>
                            <p class="text-lg text-kapok font-semibold mb-4">
                                {{ currentMobileEntry.phonetic.jyutping[0] }}
                            </p>
                            <p
                                class="text-graphite dark:text-stone-200 text-base leading-relaxed line-clamp-4 mb-4"
                            >
                                {{
                                    currentMobileEntry.senses[0]?.definition ||
                                    t("common.noDefinition")
                                }}
                            </p>
                            <span
                                class="text-xs text-graphite dark:text-stone-200 uppercase tracking-widest"
                            >
                                {{ currentMobileEntry.source_book }}
                            </span>
                        </div>
                    </NuxtLink>

                    <!-- Navigation -->
                    <div class="flex justify-between items-center mt-4 px-2">
                        <button
                            @click="nextMobileEntry"
                            class="text-kapok font-medium flex items-center gap-1 text-sm"
                        >
                            {{ t("common.next") }}
                            <svg
                                class="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                        <div class="flex gap-2">
                            <button
                                v-for="(_, idx) in randomEntries"
                                :key="idx"
                                @click="mobileIndex = idx"
                                class="flex items-center justify-center w-9 h-9 rounded-full transition-all"
                                :aria-label="
                                    t('common.switchEntryAria', {
                                        index: Number(idx) + 1,
                                    })
                                "
                            >
                                <span
                                    class="block rounded-full transition-all"
                                    :class="
                                        idx === mobileIndex
                                            ? 'bg-kapok w-5 h-1.5'
                                            : 'bg-outline-soft dark:bg-stone-700 w-1.5 h-1.5'
                                    "
                                />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Initial loading -->
                <div
                    v-if="randomEntries.length === 0 && !loadingRandomEntries"
                    class="text-center py-16"
                >
                    <div
                        class="animate-spin w-6 h-6 border-2 border-kapok border-t-transparent rounded-full mx-auto mb-3"
                    ></div>
                    <p class="text-graphite/60 dark:text-stone-200 text-sm">
                        {{ t("common.loading") }}
                    </p>
                </div>

                <!-- Browse all link -->
                <div class="mt-12 text-center">
                    <NuxtLink
                        to="/browse"
                        class="inline-flex items-center gap-2 bg-kapok text-white px-8 py-4 font-medium text-base hover:bg-kapok/90 transition-colors"
                    >
                        {{ t("browse.allEntries") }}
                        <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                        </svg>
                    </NuxtLink>
                </div>
            </section>

            <!-- Dictionary Collection Section (Book Spine Cards) -->
            <section class="bg-white dark:bg-stone-900 py-24">
                <div class="max-w-7xl mx-auto px-6">
                    <div class="text-center mb-16">
                        <h2
                            class="text-3xl md:text-4xl lg:text-5xl font-headline text-ink dark:text-stone-100 mb-4"
                        >
                            {{ t("common.includedDictionaries") }}
                        </h2>
                        <p
                            class="text-graphite dark:text-stone-200 max-w-xl mx-auto font-light"
                        >
                            {{ t("common.totalEntriesPrefix") }}
                            <span class="text-kapok font-semibold">{{
                                totalEntriesCount.toLocaleString()
                            }}</span>
                            {{ t("common.totalEntriesSuffix") }}
                        </p>
                    </div>

                    <!-- Book Spine Grid -->
                    <div
                        v-if="dictionariesData"
                        class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8"
                    >
                        <NuxtLink
                            v-for="(dict, idx) in sortedDictionaries"
                            :key="dict.id"
                            :to="dictionaryBrowsePath(dict.id)"
                            class="flex flex-col group cursor-pointer"
                        >
                            <!-- Book Spine Card -->
                            <div
                                :class="bookCardClass(idx)"
                                class="aspect-square sm:aspect-[3/4] p-3 sm:p-7 flex flex-col justify-between mb-2 sm:mb-5 shadow-sm group-hover:-translate-y-2 transition-all duration-500 relative overflow-hidden"
                            >
                                <!-- Decorative corner -->
                                <div
                                    v-if="bookCardIsDark(idx)"
                                    class="absolute top-0 right-0 w-24 h-24 bg-white/5 rotate-45 translate-x-12 -translate-y-12"
                                ></div>

                                <span
                                    class="text-sm tracking-[0.3em] font-medium opacity-90 uppercase relative z-10"
                                >
                                    {{ dict.year || '' }}
                                </span>
                                <div class="mb-4 sm:mb-8 relative z-10">
                                    <div
                                        class="text-lg sm:text-2xl md:text-3xl font-headline leading-tight mb-1 sm:mb-2"
                                    >
                                        {{ dict.lName }}
                                    </div>
                                    <div
                                        v-if="dict.lAuthor"
                                        class="text-xs sm:text-sm opacity-90 tracking-wider"
                                    >
                                        {{ dict.lAuthor }}
                                    </div>
                                </div>
                                <div
                                    class="text-sm uppercase tracking-widest opacity-90 relative z-10"
                                >
                                    {{
                                        dict.entries_count > 0
                                            ? `${dict.entries_count.toLocaleString()} ${t("common.entriesCountSuffix")}`
                                            : t("common.inProgress")
                                    }}
                                </div>
                            </div>

                            <!-- Below card: description -->
                            <h3
                                class="text-base font-bold text-ink dark:text-stone-100 mb-1 group-hover:text-kapok transition-colors"
                            >
                                {{ dict.lName }}
                            </h3>
                            <p
                                v-if="dict.lDescription"
                                class="text-sm text-graphite dark:text-stone-200"
                            >
                                {{ dict.lDescription }}
                            </p>
                        </NuxtLink>
                    </div>

                    <div class="mt-10 text-center">
                        <p
                            class="text-graphite dark:text-stone-200 text-base mb-3"
                        >
                            {{ t("common.moreDictionariesComing") }}
                        </p>
                        <NuxtLink
                            to="/about"
                            class="text-archive-green dark:text-archive-green text-base font-semibold hover:underline underline-offset-4 transition-all"
                        >
                            {{ t("common.viewLicense") }}
                        </NuxtLink>
                    </div>
                </div>
            </section>

            <!-- Contribute Section -->
            <section class="max-w-7xl mx-auto px-6 py-10 sm:py-24">
                <div
                    class="p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden bg-surface-low dark:bg-stone-800"
                >
                    <!-- Decorative background icon -->
                    <div
                        class="absolute top-0 right-0 p-10 opacity-[0.04] pointer-events-none"
                    >
                        <svg
                            class="w-40 h-40 text-kapok"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1"
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                        </svg>
                    </div>

                    <div class="relative z-10 max-w-lg">
                        <h2
                            class="text-3xl md:text-4xl font-headline text-kapok mb-6"
                        >
                            {{ t("common.contribute") }}
                        </h2>
                        <p
                            class="text-graphite dark:text-stone-200 mb-8 leading-relaxed"
                        >
                            {{ t("common.contributeDescription") }}
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4">
                            <a
                                href="https://github.com/jyutjyucom/jyutjyu"
                                target="_blank"
                                class="inline-flex items-center gap-2 bg-kapok text-white px-6 py-3 font-bold text-sm tracking-wide hover:bg-kapok/90 transition-colors"
                            >
                                <Github class="w-4 h-4" aria-hidden="true" />
                                {{ t("common.github") }}
                            </a>
                            <a
                                href="https://github.com/jyutjyucom/jyutjyu/blob/main/docs/CSV_GUIDE.md"
                                target="_blank"
                                class="inline-flex items-center gap-2 text-kapok border border-kapok/20 px-6 py-3 font-bold text-sm tracking-wide hover:bg-kapok/10 hover:border-kapok dark:hover:bg-kapok/10 dark:hover:border-kapok transition-colors bg-transparent"
                            >
                                <Database class="w-4 h-4" aria-hidden="true" />
                                {{ t("common.contributeData") }}
                            </a>
                            <FeedbackButton
                                button-class="px-6 py-3 text-kapok border border-kapok/20 font-bold text-sm tracking-wide hover:bg-kapok/10 hover:border-kapok dark:hover:bg-kapok/10 dark:hover:border-kapok transition-colors bg-transparent"
                                label-class="text-sm"
                            />
                        </div>
                    </div>

                    <div class="relative z-10 text-center md:text-right">
                        <div
                            class="text-4xl md:text-5xl font-headline text-kapok mb-2"
                        >
                            {{ totalEntriesCount.toLocaleString() }}+
                        </div>
                        <div
                            class="text-base uppercase tracking-[0.2em] text-ink dark:text-parchment font-bold"
                        >
                            {{ t("common.totalEntriesSuffix") }}
                        </div>
                    </div>
                </div>
            </section>
        </main>

        <SiteFooter />
    </div>
</template>

<script setup lang="ts">
import { Database, Github } from "lucide-vue-next";
import type { DictionaryEntry } from "~/types/dictionary";

const { t } = useI18n();
const config = useRuntimeConfig();
const { localizeDictionary, dictionariesData } = useLocalizedDictionary();

const searchQuery = ref("");
const enableReverseSearch = ref(false);
const router = useRouter();

// 使用 useState 来保持状态在页面导航时不丢失
const randomEntries = useState<DictionaryEntry[]>(
    "home-random-entries",
    () => [],
);
const mobileIndex = useState<number>("home-mobile-index", () => 0);
const loadingRandomEntries = ref(false);
const navigatingToId = ref<string | null>(null);

const { getRandomRecommendedEntries } = useSearch();

// Featured entry (first) and secondary entries (rest) for asymmetric layout
const featuredEntry = computed(() => randomEntries.value[0] || null);
const secondaryEntries = computed(() => randomEntries.value.slice(1));

// 当前移动端显示的词条（类型安全）
const currentMobileEntry = computed(() => {
    const entry = randomEntries.value[mobileIndex.value];
    return entry || null;
});

// 计算总词条数
const totalEntriesCount = computed(() => {
    if (!dictionariesData.value) return 0;
    return dictionariesData.value.dictionaries.reduce(
        (sum: number, dict: any) => sum + (dict.entries_count || 0),
        0,
    );
});

// 按名称排序词典
const sortedDictionaries = computed(() => {
    if (!dictionariesData.value) return [];
    // 使用固定的 locale 'zh-CN' 来确保排序在 SSR 和客户端一致
    const sortLocale = "zh-CN";
    return [...dictionariesData.value.dictionaries]
        .map(localizeDictionary)
        .sort((a, b) => {
            // 注意：某些 locale/敏感度设置下，localeCompare 可能把不同字符串判成"相等"(返回 0)，
            // 从而导致排序在不同运行/水合阶段出现不稳定的相对顺序。这里加二级排序保证稳定。
            const cmp = a.lName.localeCompare(b.lName, sortLocale);
            if (cmp !== 0) return cmp;
            return String(a.id).localeCompare(String(b.id), sortLocale);
        });
});

// Book spine card styling - cycles through 4 visual variants
const bookCardClass = (index: number) => {
    const styles = [
        // Dark ink (deep blue)
        "bg-ink text-white",
        // Warm gray surface
        "bg-surface-highest dark:bg-stone-800 text-ink dark:text-stone-100 border border-outline-soft/20 dark:border-stone-700",
        // Archive green
        "bg-archive-green text-white",
        // Parchment (default page background)
        "bg-parchment dark:bg-stone-950 text-ink dark:text-stone-100",
    ];
    return styles[index % styles.length];
};

const bookCardIsDark = (index: number) => index % 4 === 0 || index % 4 === 2;

// Roman numeral helper for book volume labels
const romanNumeral = (n: number): string => {
    const numerals = [
        "I",
        "II",
        "III",
        "IV",
        "V",
        "VI",
        "VII",
        "VIII",
        "IX",
        "X",
        "XI",
        "XII",
        "XIII",
        "XIV",
        "XV",
    ];
    return n <= numerals.length ? numerals[n - 1] : String(n);
};

const handleSearch = () => {
    if (searchQuery.value.trim()) {
        const params = new URLSearchParams({ q: searchQuery.value });
        if (enableReverseSearch.value) {
            params.set("reverse", "1");
        }
        router.push(`/search?${params.toString()}`);
    }
};

const searchExample = (query: string) => {
    searchQuery.value = query;
    handleSearch();
};

const wordPath = (headword: string) => {
    const cleaned = headword.replace(/[\u200B-\u200D\uFEFF]/g, "");
    return `/word/${encodeURIComponent(cleaned)}`;
};

const dictionaryBrowsePath = (dictId: string) =>
    `/browse/${encodeURIComponent(dictId)}`;

const refreshRandomEntries = async () => {
    if (loadingRandomEntries.value) return;

    loadingRandomEntries.value = true;
    try {
        const entries = await getRandomRecommendedEntries(4);
        if (entries.length > 0) {
            randomEntries.value = entries;
            mobileIndex.value = 0;
        }
    } catch (error) {
        console.error("加載隨機詞條失敗:", error);
    } finally {
        loadingRandomEntries.value = false;
        // 确保 Vue 响应式更新完成
        await nextTick();
    }
};

const nextMobileEntry = () => {
    mobileIndex.value = (mobileIndex.value + 1) % randomEntries.value.length;
};

// 只在首次加载且没有缓存数据时加载推荐词条
onMounted(() => {
    navigatingToId.value = null;
    if (randomEntries.value.length === 0) {
        refreshRandomEntries();
    }
});

const siteUrl = computed(() =>
    String(config.public.siteUrl || "").replace(/\/+$/, ""),
);
const searchTargetUrl = computed(() =>
    siteUrl.value ? `${siteUrl.value}/search?q={search_term_string}` : "",
);

const websiteStructuredData = computed(() => {
    if (!siteUrl.value || !searchTargetUrl.value) return "";

    return JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: t("common.siteName"),
        alternateName: t("common.siteSubtitle"),
        url: siteUrl.value,
        potentialAction: {
            "@type": "SearchAction",
            target: searchTargetUrl.value,
            "query-input": "required name=search_term_string",
        },
    });
});

// SEO
useHead(() => ({
    title: `${t("common.siteName")} - ${t("common.siteSubtitle")} - ${t("common.siteDescription")}`,
    meta: [
        {
            name: "description",
            content: `${t("common.siteName")} ${t("common.siteDescription")}`,
        },
    ],
    link: siteUrl.value ? [{ rel: "canonical", href: siteUrl.value }] : [],
    script: websiteStructuredData.value
        ? [
              {
                  type: "application/ld+json",
                  children: websiteStructuredData.value,
              },
          ]
        : [],
}));
</script>
