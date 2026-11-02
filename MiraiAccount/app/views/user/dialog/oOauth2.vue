<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import _ from 'lodash'
import { updateMyOAuth2AppApi, newOAuth2AppApi } from '@/apis/oauth2'
import { OAuth2ClientInfo } from '@/types'
import M3Dialog from '@/components/m3/M3Dialog.vue'
import M3TextField from '@/components/m3/M3TextField.vue'
import M3Button from '@/components/m3/M3Button.vue'

const emit = defineEmits(['update'])
const btnLoading = ref(false)
const { showMsg } = indexStore()
const formData = ref<OAuth2ClientInfo>({
  id: 0,
  userId: 0,
  name: '',
  secret: '',
  redirect: '',
  createdAt: new Date(),
  updatedAt: new Date(),
})
const open = ref(false)
const isEditMode = ref(false)
const errorText = ref('')

const openDialog = (appInfo?: OAuth2ClientInfo) => {
  open.value = true
  if (appInfo) {
    formData.value = _.cloneDeep(appInfo)
    isEditMode.value = true
  } else {
    isEditMode.value = false
    formData.value = {
      id: 0,
      userId: 0,
      name: '',
      secret: '',
      redirect: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
}

const handleOk = async () => {
  try {
    if (!formData.value.name) {
      errorText.value = '请输入应用名称'
      return
    }
    if (!formData.value.redirect) {
      errorText.value = '请输入回调 Url'
      return
    }
    errorText.value = ''
    btnLoading.value = true
    const { msg } = isEditMode.value
      ? await updateMyOAuth2AppApi(formData.value)
      : await newOAuth2AppApi(formData.value)
    showMsg(msg, 'green')
    emit('update')
    handleCancel()
  } finally {
    btnLoading.value = false
  }
}

const handleCancel = async () => {
  open.value = false
  errorText.value = ''
}

defineExpose({ openDialog })
</script>

<template>
  <M3Dialog v-model="open" :title="(isEditMode ? '编辑' : '新增') + ' OAuth2 应用'" size="sm" persistent>
    <M3TextField v-model="formData.name" label="名称" autofocus :error="errorText" />
    <M3TextField
      v-model="formData.redirect"
      label="回调 Url"
      placeholder="https://example.com/callback"
    />
    <div v-if="isEditMode" class="app-meta">
      <div>
        <p class="app-meta__label">创建日期</p>
        <p class="app-meta__value">{{ new Date(formData.createdAt).toLocaleString() }}</p>
      </div>
      <div>
        <p class="app-meta__label">最后更新</p>
        <p class="app-meta__value">{{ new Date(formData.updatedAt).toLocaleString() }}</p>
      </div>
    </div>
    <template #actions>
      <M3Button variant="text" size="sm" @click="handleCancel">取消</M3Button>
      <M3Button variant="filled" size="sm" :loading="btnLoading" @click="handleOk">确定</M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.app-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--m3e-space-3);
}

.app-meta__label {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-label-large);
}

.app-meta__value {
  margin: 2px 0 0;
  font: var(--m3e-type-body-small);
}
</style>
