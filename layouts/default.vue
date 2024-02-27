<template>
  <main class="main">
    <!-- <slot name="header">
      <Header class="header-bg" />
    </slot> -->
    <section class="section-container">
      <slot></slot>
    </section>
  </main>
</template>
<script lang="ts" setup>
</script>
<style lang="scss">
.main {
  width: 100%;
  background: $secondary;
  padding-bottom: 0;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  overflow: hidden;
}
.section-container {
  width: 100%;
  height: 100%;
}
</style>
