<script setup lang="ts">
const { data: page } = await useAsyncData('index', () => queryCollection('index').first())

const title = page.value?.seo?.title || page.value?.title
const description = page.value?.seo?.description || page.value?.description

useSeoMeta({
  titleTemplate: '',
  title,
  ogTitle: title,
  description,
  ogDescription: description
})
</script>

<template>
  <div v-if="page">
    <UPageHero
      :title="page.title"
      :description="page.description"
      :links="page.hero?.links"
    >
      <template #top>
        <HeroBackground />
      </template>

      <template #title>
        <MDC
          :value="page.title"
          unwrap="p"
        />
      </template>
    </UPageHero>

    <UPageSection
      v-for="(section, index) in page.sections"
      :key="index"
      :title="section.title"
      :description="section.description"
      :orientation="section.orientation"
      :reverse="section.reverse"
      :features="section.features"
    >
      <div class="rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 aspect-video flex items-center justify-center">
        <UIcon
          name="i-lucide-bot"
          class="w-24 h-24 text-primary-300 dark:text-primary-700"
        />
      </div>
    </UPageSection>

    <UPageSection
      :title="page.features?.title"
      :description="page.features?.description"
    >
      <UPageGrid>
        <UPageCard
          v-for="(item, index) in page.features?.items"
          :key="index"
          v-bind="item"
          spotlight
        />
      </UPageGrid>
    </UPageSection>

    <UPageSection
      id="testimonials"
      :headline="page.testimonials?.headline"
      :title="page.testimonials?.title"
      :description="page.testimonials?.description"
    >
      <UPageColumns class="xl:columns-3">
        <UPageCard
          v-for="(testimonial, index) in page.testimonials?.items"
          :key="index"
          variant="subtle"
          :description="testimonial.quote"
          :ui="{ description: 'before:content-[open-quote] after:content-[close-quote]' }"
        >
          <template #footer>
            <UUser
              v-bind="testimonial.user"
              size="lg"
            />
          </template>
        </UPageCard>
      </UPageColumns>
    </UPageSection>

    <USeparator />

    <UPageCTA
      v-bind="page.cta"
      variant="naked"
      class="overflow-hidden"
    >
      <LazyStarsBg />
    </UPageCTA>
  </div>
</template>
