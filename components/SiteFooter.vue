<template>
    <footer
        class="bg-parchment dark:bg-stone-950 py-12 px-6 mt-auto"
    >
        <div class="flex items-center gap-3 max-w-7xl mx-auto w-full mb-12">
            <div class="flex-1 h-px bg-kapok/30 dark:bg-kapok/20"></div>
            <div class="w-1.5 h-1.5 rounded-full bg-kapok/60 dark:bg-kapok/40"></div>
            <div class="flex-1 h-px bg-kapok/30 dark:bg-kapok/20"></div>
        </div>
        <div
            class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto w-full"
        >
            <!-- Brand column -->
            <div>
                <div class="text-4xl font-headline text-kapok mb-4">粵</div>
                <p
                    class="text-graphite dark:text-stone-500 text-sm leading-relaxed mb-4"
                >
                    {{ t("common.footerCopyright") }}
                </p>
                <p
                    class="text-graphite/60 dark:text-stone-600 text-sm leading-relaxed"
                >
                    {{ t("common.footerOcrDisclaimerPrefix") }}
                    <ClientOnly>
                        <FeedbackButton
                            hide-icon
                            :button-class="'p-0 !min-h-0 bg-transparent text-kapok hover:text-kapok/80 underline-offset-4 hover:underline rounded-none border-0 shadow-none'"
                            :label-class="'text-inherit'"
                        />
                    </ClientOnly>
                </p>
            </div>

            <!-- About links -->
            <div>
                <h5
                    class="text-base font-bold tracking-[0.05em] uppercase mb-6 text-ink dark:text-stone-200"
                >
                    {{ t("common.aboutProject") }}
                </h5>
                <ul class="flex flex-col gap-3">
                    <li>
                        <NuxtLink
                            to="/about"
                            class="text-sm text-graphite dark:text-stone-500 hover:text-kapok underline-offset-4 hover:underline transition-all"
                            >{{ t("common.aboutProject") }}</NuxtLink
                        >
                    </li>
                    <li>
                        <NuxtLink
                            to="/browse"
                            class="text-sm text-graphite dark:text-stone-500 hover:text-kapok underline-offset-4 hover:underline transition-all"
                            >{{ t("browse.allEntries") }}</NuxtLink
                        >
                    </li>
                    <li>
                        <a
                            href="https://github.com/jyutjyucom/jyutjyu"
                            class="text-sm text-graphite dark:text-stone-500 hover:text-kapok underline-offset-4 hover:underline transition-all"
                            target="_blank"
                            rel="noopener noreferrer"
                            >{{ t("common.github") }}</a
                        >
                    </li>
                </ul>
            </div>

            <!-- Friend links -->
            <div>
                <h5
                    class="text-base font-bold tracking-[0.05em] uppercase mb-6 text-ink dark:text-stone-200"
                >
                    {{ t("common.footerFriendLinks") }}
                </h5>
                <ul class="flex flex-col gap-3">
                    <li>
                        <a
                            href="https://jyutping.org/jyutping/"
                            class="text-sm text-graphite dark:text-stone-500 hover:text-kapok underline-offset-4 hover:underline transition-all"
                            target="_blank"
                            rel="noopener noreferrer"
                            >{{ t("common.footerJyutping") }}</a
                        >
                    </li>
                    <li>
                        <a
                            href="https://www.jyutdict.org/"
                            class="text-sm text-graphite dark:text-stone-500 hover:text-kapok underline-offset-4 hover:underline transition-all"
                            target="_blank"
                            rel="noopener noreferrer"
                            >{{ t("common.footerJyutDict") }}</a
                        >
                    </li>
                    <li>
                        <a
                            href="https://jyut.net/"
                            class="text-sm text-graphite dark:text-stone-500 hover:text-kapok underline-offset-4 hover:underline transition-all"
                            target="_blank"
                            rel="noopener noreferrer"
                            >{{ t("common.footerJyutNet") }}</a
                        >
                    </li>
                </ul>
            </div>
        </div>
    </footer>
</template>

<script setup lang="ts">
const { t } = useI18n();

interface Props {
    variant?: "home" | "search";
}

withDefaults(defineProps<Props>(), {
    variant: "home",
});
</script>
