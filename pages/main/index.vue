<template>
  <div>
    <div v-if="data" v-html="data.html"></div>
  </div>
</template>

<script setup lang="ts">
const { data } = await useFetch<{ html: string }>('/api/getMarkdown');
</script>
