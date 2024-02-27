<template>
  <div class="error-page">
    <header>
      <a href="/" alt="main">回首页</a>
    </header>
    <div class="main">
      <h1 class="title">An error occurred!</h1>
      <p class="tip">We cannot complete your request possibly due to unstable network or a missing page.</p>
      <a href="/" alt="main"><div class="error-btn">Back to homepage</div></a>
    </div>
  </div>
</template>

<script setup lang="ts" name="setup"></script>

<style lang="scss" scoped>
.error-page {
  header {
    height: 96px;
    display: flex;
    align-items: center;
    padding-left: 32px;
    .logo {
      width: 252px;
      height: 48px;
    }
  }
  .main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    .error-img {
      width: 320px;
      height: 176px;
      margin-top: 236px;
    }
    .title {
      font-family: Helvetica;
      font-size: 56px;
      color: var(--qai-text-color);
      text-align: center;
      line-height: 64px;
      font-weight: 700;
      margin: 64px 0 24px 0;
    }
    .tip {
      font-family: PingFangSC-Regular;
      font-size: 28px;
      color: var(--qai-subtitle-color);
      letter-spacing: 0;
      text-align: center;
      line-height: 48px;
      font-weight: 400;
      padding: 0 32px;
    }
    .error-btn {
      margin-top: 48px;
      width: 363px;
      height: 88px;
      background: var(--qai-text-color);
      border-radius: 44px;
      text-align: center;
      line-height: 88px;
      font-family: Helvetica;
      font-size: 32px;
      color: var(--qai-title-color);
      letter-spacing: 0;
      font-weight: 400;
    }
  }
}
</style>
