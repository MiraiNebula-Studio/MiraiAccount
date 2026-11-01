<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { indexStore } from '@/stores'
import { useElementSize } from '@vueuse/core'
import { getStatisticApi } from '@/apis/site'
import { proxyImg, IMG_PLACEHOLDER } from '@/utils/img'
const { appTheme } = indexStore()

const c1 = ref<HTMLElement>()
const { height: c1_h } = useElementSize(c1)

const loading = ref(false)
const userCount = ref('0')
const OAuthClientCount = ref('0')
const dailyRegStatistics = ref({
  date: ['LOADING'],
  count: [0]
})
const dailyLoginStatistics = ref({
  date: [] as string[],
  success: [] as number[],
  fail: [] as number[]
})

const getStatistics = async () => {
  loading.value = true
  const { data } = await getStatisticApi()
  loading.value = false
  userCount.value = data.user
  OAuthClientCount.value = data.oauth_clients
  dailyRegStatistics.value = data.dailyRegStatistics
  dailyLoginStatistics.value = data.dailyLoginStatistics ?? { date: [], success: [], fail: [] }
}

onMounted(async () => {
  await getStatistics()
})
</script>

<template>
  <div>
    <v-row>
      <v-col cols="12" xs="12" sm="6" md="4">
        <v-card variant="outlined" ref="c1" :loading="loading" :disabled="loading">
          <v-card-title> 注册用户 </v-card-title>

          <v-card-text class="py-0">
            <v-row align="center" no-gutters>
              <v-col class="text-h2 text-orange-lighten-2" cols="8">{{ userCount }} </v-col>

              <v-col class="text-right" cols="4">
                <v-icon
                  class="user-icon-shadow"
                  color="orange-lighten-3"
                  icon="mdi-human-cane"
                  size="88"
                ></v-icon>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-btn block color="orange" to="/admin/users"> 用户管理 </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" xs="12" sm="6" md="4">
        <v-card variant="outlined" :loading="loading" :disabled="loading">
          <v-card-title> OAuth2 应用数量 </v-card-title>

          <v-card-text class="py-0">
            <v-row align="center" no-gutters>
              <v-col class="text-h2 text-teal" cols="8">{{ OAuthClientCount }}</v-col>

              <v-col class="text-right" cols="4">
                <v-icon
                  class="oa-icon-shadow"
                  color="teal-lighten-3"
                  icon="mdi-vector-link"
                  size="88"
                ></v-icon>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-btn block color="teal" to="/admin/oauth2"> 应用管理 </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" xs="12" sm="12" md="4">
        <v-card variant="outlined" :disabled="loading">
          <v-img
            :src="proxyImg('https://api.imlazy.ink/img/')"
            :lazy-src="IMG_PLACEHOLDER"
            loading="lazy"
            cover
            :height="c1_h"
            alt="Random image"
          ></v-img>
        </v-card>
      </v-col>
    </v-row>
    <v-card class="mt-5" variant="outlined" :loading="loading" :disabled="loading">
      <v-card-title> 用户注册趋势 </v-card-title>
      <!-- 数据不足 2 点时不渲染，避免 sparkline 在容器宽度 0 / 空数据时算出 NaN 坐标 -->
      <v-sparkline
        v-if="dailyRegStatistics.count.length > 1"
        :labels="dailyRegStatistics.date as any"
        :model-value="dailyRegStatistics.count"
        :radius="10"
        :line-width="1.5"
        :gradient="['#dfbbff', '#a9aaff', '#6da3c5']"
        :color="appTheme === 'dark' ? 'rgba(255, 255, 255, .5)' : 'rgba(0, 0, 0, .5)'"
        label-size="5"
        height="100"
        :padding="20"
        smooth
      >
      </v-sparkline>
    </v-card>
    <v-card class="mt-5" variant="outlined" :loading="loading" :disabled="loading">
      <v-card-title>
        登录趋势
        <v-chip size="small" color="green" class="ml-2">成功 {{ dailyLoginStatistics.success.at(-1) ?? 0 }}</v-chip>
        <v-chip size="small" color="red" class="ml-2">失败 {{ dailyLoginStatistics.fail.at(-1) ?? 0 }}</v-chip>
      </v-card-title>
      <v-row v-if="dailyLoginStatistics.date.length > 1" class="px-4 pb-2 no-gutters">
        <v-col cols="12" sm="6">
          <v-sparkline
            :labels="dailyLoginStatistics.date as any"
            :model-value="dailyLoginStatistics.success"
            :radius="10"
            :line-width="1.5"
            :gradient="['#5fdba7', '#1cb15c']"
            :color="appTheme === 'dark' ? 'rgba(255, 255, 255, .5)' : 'rgba(0, 0, 0, .5)'"
            label-size="5"
            height="100"
            :padding="20"
            smooth
          ></v-sparkline>
        </v-col>
        <v-col cols="12" sm="6">
          <v-sparkline
            :labels="dailyLoginStatistics.date as any"
            :model-value="dailyLoginStatistics.fail"
            :radius="10"
            :line-width="1.5"
            :gradient="['#ffb199', '#e35d5b']"
            :color="appTheme === 'dark' ? 'rgba(255, 255, 255, .5)' : 'rgba(0, 0, 0, .5)'"
            label-size="5"
            height="100"
            :padding="20"
            smooth
          ></v-sparkline>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>

<style lang="scss" scoped>
.user-icon-shadow {
  text-shadow:
    -20px 0px 10px #e5b671,
    20px 0px 10px #db9b7d;
}

.oa-icon-shadow {
  text-shadow:
    -15px 15px 15px #a780cb,
    15px -15px 15px #73caff;
}
</style>
