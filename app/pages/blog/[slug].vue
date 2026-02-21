<script setup lang="ts">
const route = useRoute()

const { data: post } = await useAsyncData(route.path, () =>
  queryCollection('posts').path(route.path).first()
)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post não encontrado' })
}

const title = post.value?.title
const description = post.value?.description

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogImage: post.value?.image?.src
})
</script>

<template>
  <UContainer
    v-if="post"
    class="py-16"
  >
    <UPage>
      <UPageHeader
        :title="post.title"
        :description="post.description"
      >
        <template #headline>
          <UBadge
            v-if="post.badge"
            v-bind="post.badge"
            variant="subtle"
          />
        </template>

        <div class="flex items-center gap-4 mt-4 text-sm text-muted">
          <time v-if="post.date">
            {{ new Date(post.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' }) }}
          </time>
          <div
            v-if="post.authors?.length"
            class="flex items-center gap-2"
          >
            <UAvatar
              v-for="author in post.authors"
              :key="author.name"
              :src="author.avatar?.src"
              :alt="author.name"
              size="xs"
            />
            <span>{{ post.authors.map((a: { name: string }) => a.name).join(', ') }}</span>
          </div>
        </div>
      </UPageHeader>

      <img
        v-if="post.image?.src"
        :src="post.image.src"
        :alt="post.title"
        class="w-full rounded-2xl object-cover aspect-video mb-8"
      >

      <UPageBody prose>
        <ContentRenderer :value="post" />

        <USeparator class="my-8" />

        <div class="flex justify-between items-center">
          <UButton
            to="/blog"
            variant="ghost"
            icon="i-lucide-arrow-left"
            label="Voltar ao Blog"
          />
          <UButton
            to="/pricing"
            color="primary"
            trailing-icon="i-lucide-arrow-right"
            label="Começar Grátis"
          />
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>
