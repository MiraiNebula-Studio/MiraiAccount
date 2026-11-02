<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import ErrorScreen from '@/components/ErrorScreen.vue'
import { proxyImg } from '@/utils/img'

const errPath = useRouteQuery('errPath')
const image = proxyImg(
  'https://cdn.imlazy.ink:233/img/%E8%A1%A8%E6%83%85%E5%8C%85/%E7%8C%AB%E7%BE%BD%E9%9B%AB/017.png',
)
</script>

<template>
  <ErrorScreen code="404" :image="image" message="你访问的页面不存在" :err-path="String(errPath || '')" />
</template>
