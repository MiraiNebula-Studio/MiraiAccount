<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import _ from 'lodash'
import { updateConfigApi } from '@/apis/site'
import { SiteOptions } from '@/types'
import M3Dialog from '@/components/m3/M3Dialog.vue'
import M3TextField from '@/components/m3/M3TextField.vue'
import M3Button from '@/components/m3/M3Button.vue'

const emit = defineEmits(['update'])
const btnLoading = ref(false)
const { showMsg } = indexStore()
const formData = ref<SiteOptions>({
  id: 0,
  note: '',
  value: '',
  optionName: '',
  updatedAt: new Date(),
})
const open = ref(false)
const errorText = ref('')

const openDialog = (config: SiteOptions) => {
  open.value = true
  errorText.value = ''
  formData.value = _.cloneDeep(config)
}

const handleOk = async () => {
  try {
    if (!formData.value.note) {
      errorText.value = '请填写备注'
      return
    }
    if (!formData.value.value) {
      errorText.value = '值不能为空'
      return
    }
    errorText.value = ''
    btnLoading.value = true
    const { msg } = await updateConfigApi(formData.value)
    showMsg(msg, 'green')
    emit('update')
    handleCancel()
  } finally {
    btnLoading.value = false
  }
}

const handleCancel = async () => {
  open.value = false
}

defineExpose({ openDialog })
</script>

<template>
  <M3Dialog v-model="open" title="编辑站点配置" size="sm" persistent>
    <div class="site-meta">
      <span class="site-meta__label">配置项</span>
      <code>{{ formData.optionName }}</code>
    </div>
    <M3TextField v-model="formData.note" label="备注" autofocus />
    <M3TextField v-model="formData.value" label="值" />
    <div class="site-meta">
      <span class="site-meta__label">最后更新</span>
      <span class="site-meta__value">{{ new Date(formData.updatedAt).toLocaleString() }}</span>
    </div>
    <p v-if="errorText" class="site-error">{{ errorText }}</p>

    <template #actions>
      <M3Button variant="text" size="sm" @click="handleCancel">取消</M3Button>
      <M3Button variant="filled" size="sm" :loading="btnLoading" @click="handleOk">确定</M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.site-meta {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-2);
  margin-bottom: var(--m3e-space-4);
}

.site-meta__label {
  color: var(--on-surface-variant);
  font: var(--m3e-type-label-large);
}

.site-meta__value {
  font: var(--m3e-type-body-small);
}

.site-error {
  margin: 0;
  color: var(--error);
  font: var(--m3e-type-body-small);
}
</style>
