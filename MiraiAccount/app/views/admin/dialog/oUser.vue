<script lang="ts" setup>
import { ref, computed } from 'vue'
import { indexStore } from '@/stores'
import _ from 'lodash'
import { addUserApi, updateUserInfoApi } from '@/apis/user'
import { UserInfo } from '@/types'
import { UserStatus } from '@/types'
import { roleLabel } from '@/utils/role'
import M3Dialog from '@/components/m3/M3Dialog.vue'
import M3TextField from '@/components/m3/M3TextField.vue'
import M3Select from '@/components/m3/M3Select.vue'
import M3Button from '@/components/m3/M3Button.vue'

// 是否超级管理员：仅超管可调整权限组；超级管理员目标不可编辑。
const props = defineProps<{ isSuper?: boolean; selfId?: number }>()
const emit = defineEmits(['update'])
const btnLoading = ref(false)
const { showMsg } = indexStore()
const formData = ref<UserInfo>({
  id: 0,
  username: '',
  password: '',
  status: 0,
  role: '',
  email: '',
  regTime: '',
  apikey: '',
  verifyToken: '',
})
const open = ref(false)
const adding = ref(false)
const errorText = ref('')

// 目标为超级管理员时，权限组与状态永不可改动。
const isSuperTarget = computed(() => formData.value.role === 'superadmin')
const editable = computed(
  () =>
    props.isSuper ||
    (formData.value.role !== 'admin' && formData.value.role !== 'superadmin') ||
    formData.value.id === props.selfId
)
const disabledField = computed(() => btnLoading.value || !editable.value)

const statusOptions = [
  { label: '正常', value: UserStatus.NORMAL },
  { label: '封禁', value: UserStatus.BANNED },
]
const roleOptions = [
  { label: '默认', value: 'default' },
  { label: '管理员', value: 'admin' },
]
const statusModel = computed({
  get: () => String(formData.value.status ?? 0),
  set: (v: string | number) => (formData.value.status = Number(v)),
})

const openDialog = (userInfo?: UserInfo) => {
  adding.value = !userInfo || userInfo.id === 0
  open.value = true
  errorText.value = ''
  formData.value = _.cloneDeep(
    userInfo && userInfo.id
      ? userInfo
      : {
          id: 0,
          username: '',
          password: '',
          status: 0,
          role: 'default',
          email: '',
          regTime: '',
          apikey: '',
          verifyToken: '',
        }
  )
  formData.value.password = ''
}

const checkUName = (v: string) => /^[a-zA-Z0-9_-]{4,16}$/.test(v)

const handleOk = async () => {
  try {
    if (!checkUName(formData.value.username)) {
      errorText.value = '用户名必须为 4-16 位字母、数字、下划线或短横线'
      return
    }
    if (!formData.value.email) {
      errorText.value = '请填写绑定邮箱'
      return
    }
    if (adding.value && !formData.value.password) {
      errorText.value = '请填写初始密码'
      return
    }
    errorText.value = ''
    btnLoading.value = true
    const { msg } = adding.value
      ? await addUserApi(formData.value)
      : await updateUserInfoApi(formData.value)
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
  <M3Dialog
    v-model="open"
    :title="adding ? '添加用户' : `编辑用户 ${formData.username}`"
    size="lg"
    persistent
  >
    <div class="user-form">
      <M3TextField
        v-model="formData.username"
        label="用户名"
        :disabled="btnLoading || !editable || (!props.isSuper && !adding)"
        :help="!adding ? (props.isSuper ? '超级管理员可修改用户名' : '仅超级管理员可修改用户名') : ''"
      />
      <M3TextField v-model="formData.email" label="绑定邮箱" type="email" :disabled="disabledField" />
      <M3TextField
        v-model="formData.password"
        label="密码"
        type="password"
        reveal
        :placeholder="adding ? '初始密码' : '（未更改）'"
        :disabled="disabledField"
      />
      <M3Select
        v-model="statusModel"
        :options="statusOptions"
        label="状态"
        :disabled="btnLoading || isSuperTarget || !editable || (!props.isSuper && formData.role === 'admin')"
      />
      <M3Select
        v-if="props.isSuper && !isSuperTarget"
        v-model="formData.role"
        :options="roleOptions"
        label="权限组"
        :disabled="btnLoading || !editable"
      />
      <M3TextField v-else :model-value="roleLabel(formData.role)" label="权限组" readonly :disabled="btnLoading || !editable" />
      <M3TextField v-model="formData.apikey" label="APIKEY" placeholder="暂时没啥用" :disabled="disabledField" />
    </div>

    <p v-if="errorText" class="user-form__error">{{ errorText }}</p>
    <p class="user-form__note">
      <b>注意：</b>修改用户名或者邮箱后，需要用户手动重新绑定 PassKey！
      <template v-if="isSuperTarget">超级管理员的权限组与状态不可修改。</template>
    </p>

    <template #actions>
      <M3Button variant="text" size="sm" @click="handleCancel">取消</M3Button>
      <M3Button variant="filled" size="sm" :loading="btnLoading" @click="handleOk">确定</M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.user-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--m3e-space-3);
}

.user-form :deep(.m3-field) {
  margin-bottom: var(--m3e-space-3);
}

.user-form__error {
  margin: 0 0 var(--m3e-space-2);
  color: var(--error);
  font: var(--m3e-type-body-small);
}

.user-form__note {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
  line-height: 1.6;
}

@media (max-width: 640px) {
  .user-form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
