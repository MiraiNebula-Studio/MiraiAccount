<script lang="ts" setup>
import { ref, computed } from 'vue'
import { indexStore } from '@/stores'
import { useDisplay } from 'vuetify'
import type { VForm } from 'vuetify/lib/components/index.mjs'
import _ from 'lodash'
import { addUserApi, updateUserInfoApi } from '@/apis/user'
import { UserInfo } from '@/types'
import { UserStatus } from '@/types'
import { roleLabel } from '@/utils/role'

// 是否超级管理员：仅超管可调整权限组；超级管理员目标不可编辑。
const props = defineProps<{ isSuper?: boolean; selfId?: number }>()
const emit = defineEmits(['update'])
const { xs } = useDisplay()
const btnLoading = ref(false)
const { showMsg } = indexStore()
const form = ref<InstanceType<typeof VForm>>()
const formData = ref<UserInfo>({
  id: 0,
  username: '',
  password: '',
  status: 0,
  role: '',
  email: '',
  regTime: '',
  apikey: '',
  verifyToken: ''
})
const open = ref(false)
// 添加模式：新增用户；编辑模式：更新已有用户。
const adding = ref(false)

// 目标为超级管理员时，权限组与状态永不可改动。
const isSuperTarget = computed(() => formData.value.role === 'superadmin')
// 非超级管理员仅可编辑自己的账户（或普通用户），管理员/超管账户其余整窗锁定。
const editable = computed(
  () =>
    props.isSuper ||
    (formData.value.role !== 'admin' && formData.value.role !== 'superadmin') ||
    formData.value.id === props.selfId
)
const disabledField = computed(() => btnLoading.value || !editable.value)

const openDialog = (userInfo?: UserInfo) => {
  adding.value = !userInfo || userInfo.id === 0
  open.value = true
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
          verifyToken: ''
        }
  )
  formData.value.password = ''
}

const handleOk = async () => {
  try {
    if (!form.value) return
    const { valid } = await form.value.validate()
    if (!valid) return
    btnLoading.value = true
    // 添加模式下密码必填；编辑模式留空表示不改。
    if (adding.value && !formData.value.password) {
      showMsg('请填写初始密码', 'red')
      return
    }
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
  form.value?.reset()
}

const checkUName = (v: string) => {
  if (v && v.length === 0) return false
  if (!/^[a-zA-Z0-9_-]{4,16}$/.test(v)) return '用户名必须为 4-16 位之间'
  return true
}

defineExpose({
  openDialog
})
</script>

<template>
  <v-dialog v-model="open" max-width="600" persistent>
    <v-card
      :title="adding ? '添加用户' : `编辑用户 ${formData.username}`"
      variant="flat"
    >
      <v-card-text class="py-0 pt-5">
        <v-form ref="form" fast-fail @submit.prevent>
          <v-row :no-gutters="xs">
            <v-col cols="12" xs="12" sm="6">
              <v-text-field
                v-model="formData.username"
                :rules="[(v) => checkUName(v)]"
                clearable
                density="compact"
                label="用户名"
                :disabled="btnLoading || !editable || (!props.isSuper && !adding)"
                :persistent-hint="!adding"
                :hint="!adding ? (props.isSuper ? '超级管理员可修改用户名' : '仅超级管理员可修改用户名') : ''"
              >
              </v-text-field>
            </v-col>
            <v-col cols="12" xs="12" sm="6">
              <v-text-field
                v-model="formData.email"
                :rules="[(v) => (v && v.length > 0 ? true : false)]"
                clearable
                density="compact"
                label="绑定邮箱"
                type="email"
                :disabled="disabledField"
              >
              </v-text-field>
            </v-col>
            <v-col cols="12" xs="12" sm="6">
              <v-text-field
                v-model="formData.password"
                clearable
                density="compact"
                label="密码"
                :placeholder="adding ? '初始密码' : '（未更改）'"
                :disabled="disabledField"
              >
              </v-text-field>
            </v-col>
            <v-col cols="12" xs="12" sm="6">
              <v-select
                v-model="formData.status"
                :items="[
                  { text: '正常', value: UserStatus.NORMAL },
                  { text: '封禁', value: UserStatus.BANNED }
                ]"
                item-title="text"
                item-value="value"
                density="compact"
                label="状态"
                variant="outlined"
                persistent-hint
                :disabled="
                  btnLoading || isSuperTarget || !editable || (!props.isSuper && formData.role === 'admin')
                "
              ></v-select>
            </v-col>
            <v-col cols="12" xs="12" sm="6">
              <v-select
                v-if="props.isSuper && !isSuperTarget"
                v-model="formData.role"
                :items="[
                  { text: '默认', value: 'default' },
                  { text: '管理员', value: 'admin' }
                ]"
                item-title="text"
                item-value="value"
                density="compact"
                label="权限组"
                variant="outlined"
                :disabled="btnLoading || !editable"
              ></v-select>
              <v-text-field
                v-else
                :model-value="roleLabel(formData.role)"
                readonly
                density="compact"
                label="权限组"
                variant="outlined"
                :disabled="btnLoading || !editable"
              ></v-text-field>
            </v-col>
            <v-col cols="12" xs="12" sm="6">
              <v-text-field
                v-model="formData.apikey"
                clearable
                density="compact"
                label="APIKEY"
                placeholder="暂时没啥用"
                :disabled="disabledField"
              >
              </v-text-field>
            </v-col>
          </v-row>
        </v-form>
        <small
          ><b>注意：</b
          >修改用户名或者邮箱后，需要用户手动重新绑定PassKey！<template v-if="isSuperTarget">超级管理员的权限组与状态不可修改。</template></small
        >
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="handleCancel"> 取消 </v-btn>

        <v-btn @click="handleOk" color="primary" :loading="btnLoading"> 确定 </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
