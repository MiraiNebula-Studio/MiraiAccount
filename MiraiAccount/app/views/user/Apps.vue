<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { OAuth2ClientInfo } from '@/types'
import { getMyOAuth2AppsApi, delMyOAuth2AppApi } from '@/apis/oauth2'
import oOauth2 from './dialog/oOauth2.vue'
import { indexStore } from '@/stores'
import { resetOAuth2SecretApi } from '@/apis/oauth2'
import M3Icon from '@/components/m3/M3Icon.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3IconButton from '@/components/m3/M3IconButton.vue'
import M3Chip from '@/components/m3/M3Chip.vue'
import CopyTool from '@/components/CopyTool.vue'

const { showMsg, openConfirmDialog } = indexStore()
const serverItems = ref<OAuth2ClientInfo[]>([])
const oOauth2Dialog = ref<InstanceType<typeof oOauth2>>()
const cardLoading = ref(false)
const expanded = ref<number | null>(null)

const getAppList = async () => {
  cardLoading.value = true
  const { data } = await getMyOAuth2AppsApi()
  serverItems.value = data
  cardLoading.value = false
}

const toDelete = async (item: OAuth2ClientInfo) => {
  const flag = await openConfirmDialog('警告', '你确定要删除这个 OAuth2 应用吗？此操作不可逆转！')
  if (!flag) return
  cardLoading.value = true
  const { msg } = await delMyOAuth2AppApi(item)
  await getAppList()
  return showMsg(msg, 'green')
}

const toResetSecret = async (item: OAuth2ClientInfo) => {
  const flag = await openConfirmDialog('警告', '是否重置此应用的密钥？')
  if (!flag) return
  cardLoading.value = true
  const { msg } = await resetOAuth2SecretApi(item)
  await getAppList()
  return showMsg(msg, 'green')
}

onMounted(async () => {
  await getAppList()
})
</script>

<template>
  <div class="apps">
    <div class="apps-head">
      <div>
        <h2 class="apps-title">OAuth2 应用</h2>
        <p class="apps-subtitle">总计 {{ serverItems.length }} 个应用</p>
      </div>
      <M3Button variant="filled" size="sm" icon="add" @click="oOauth2Dialog?.openDialog()">
        添加应用
      </M3Button>
    </div>

    <div v-if="cardLoading" class="loading-line" />

    <div v-else-if="!serverItems.length" class="m3-empty">
      <M3Icon name="apps" :size="44" />
      <b>还没有创建应用</b>
      <span>创建 OAuth2 应用后即可接入第三方登录。</span>
    </div>

    <div v-else class="apps-list">
      <article
        v-for="item in serverItems"
        :key="item.id"
        class="app-card"
        :class="{ 'is-open': expanded === item.id }"
      >
        <button type="button" class="app-card__head m3-state-layer" @click="expanded = expanded === item.id ? null : item.id">
          <span class="app-card__icon"><M3Icon name="apps" :size="22" /></span>
          <span class="app-card__name">{{ item.name }}</span>
          <M3Chip size="sm" variant="outlined">#{{ item.id }}</M3Chip>
          <M3Icon :name="expanded === item.id ? 'expand_less' : 'expand_more'" :size="22" />
        </button>

        <div
          class="app-card__body"
          :class="{ 'is-open': expanded === item.id }"
          :aria-hidden="expanded !== item.id"
          :inert="expanded !== item.id"
        >
          <div class="app-card__body-inner">
            <div class="app-grid">
              <div>
                <p class="app-label">ID</p>
                <p class="app-value">{{ item.id }}</p>
              </div>
              <div>
                <p class="app-label">客户端 Secret</p>
                <div class="app-value-row">
                  <CopyTool :text="item.secret">
                    <template #default="{ act }">
                      <code v-bind="act" class="app-secret">{{ item.secret }}</code>
                    </template>
                  </CopyTool>
                  <M3IconButton
                    icon="lock_reset"
                    label="重置密钥"
                    size="sm"
                    @click="toResetSecret(item)"
                  />
                </div>
              </div>
              <div class="app-grid__wide">
                <p class="app-label">回调 Url</p>
                <CopyTool :text="item.redirect">
                  <template #default="{ act }">
                    <code v-bind="act" class="app-secret">{{ item.redirect }}</code>
                  </template>
                </CopyTool>
              </div>
            </div>

            <div class="app-actions">
              <M3Button
                variant="outlined"
                size="sm"
                icon="edit"
                @click="oOauth2Dialog?.openDialog(item)"
              >
                编辑
              </M3Button>
              <M3Button variant="text" size="sm" icon="delete" @click="toDelete(item)">删除</M3Button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <oOauth2 ref="oOauth2Dialog" @update="getAppList" />
  </div>
</template>

<style scoped>
.apps-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--m3e-space-3);
  margin-bottom: var(--m3e-space-4);
}

.apps-title {
  margin: 0;
  font: var(--m3e-type-title-large);
}

.apps-subtitle {
  margin: 2px 0 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
}

.apps-list {
  display: flex;
  flex-direction: column;
  gap: var(--m3e-space-3);
}

.app-card {
  border-radius: var(--shape-corner-l);
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
  overflow: hidden;
}

.app-card.is-open {
  background: var(--card-bg);
  box-shadow: var(--m3e-elevation-1);
}

.app-card__head {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-3);
  width: 100%;
  padding: var(--m3e-space-4);
  border: 0;
  background: none;
  color: var(--on-surface);
  text-align: left;
}

.app-card__icon {
  color: var(--primary);
}

.app-card__name {
  flex: 1 1 auto;
  font: var(--m3e-type-title-small);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-card__body {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  overflow: hidden;
  transition:
    grid-template-rows var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate),
    opacity var(--m3e-duration-short) var(--m3e-easing-standard);
}

.app-card__body.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.app-card__body-inner {
  overflow: hidden;
  padding: 0 var(--m3e-space-4) var(--m3e-space-4);
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--m3e-space-3);
  padding-top: var(--m3e-space-3);
  border-top: 1px solid var(--line-divider);
}

.app-grid__wide {
  grid-column: 1 / -1;
}

.app-label {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-label-large);
}

.app-value {
  margin: 2px 0 0;
  font: var(--m3e-type-body-medium);
  word-break: break-all;
}

.app-value-row {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-1);
}

.app-secret {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  background: var(--inline-code-bg);
  padding: 2px 6px;
  border-radius: var(--shape-corner-xs);
}

.app-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--m3e-space-2);
  margin-top: var(--m3e-space-4);
}

@media (max-width: 700px) {
  .app-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .apps-head {
    align-items: flex-start;
  }
}
</style>
