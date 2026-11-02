<script lang="ts" setup>
import { ref, computed } from 'vue'
import { indexStore } from '@/stores'
import { userStore } from '@/stores/user'
import { getUserListApi, delUserApi, exportUserDataApi } from '@/apis/user'
import { sendUserMessageApi } from '@/apis/message'
import { type UserInfo, UserStatus } from '@/types'
import { userStatus } from '@/types/const'
import { roleLabel } from '@/utils/role'
import oUser from './dialog/oUser.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3IconButton from '@/components/m3/M3IconButton.vue'
import M3Chip from '@/components/m3/M3Chip.vue'
import M3Dialog from '@/components/m3/M3Dialog.vue'
import M3TextField from '@/components/m3/M3TextField.vue'
import M3Textarea from '@/components/m3/M3Textarea.vue'
import M3Icon from '@/components/m3/M3Icon.vue'
import CopyTool from '@/components/CopyTool.vue'
import DataTable from '@/components/DataTable.vue'

const oUserDialog = ref<InstanceType<typeof oUser>>()
const { showMsg, openConfirmDialog } = indexStore()
const { info } = userStore()

// 仅超级管理员可设置管理员权限；超级管理员自身受保护，只在权限组/状态上锁定。
const isSuper = computed(() => info?.role === 'superadmin')
const isSuperTarget = (item: UserInfo) => item.role === 'superadmin'
const canEdit = (item: UserInfo) =>
  isSuper.value ||
  (item.role !== 'admin' && item.role !== 'superadmin') ||
  item.id === info?.id
const canDelete = (item: UserInfo) =>
  item.role !== 'superadmin' && (isSuper.value || item.role !== 'admin')

const headers = [
  { key: 'id', title: 'ID' },
  { key: 'username', title: '用户名', width: '120px' },
  { key: 'email', title: '绑定邮箱', width: '180px' },
  { key: 'role', title: '权限组', width: '110px' },
  { key: 'status', title: '状态', width: '90px' },
  { key: 'otpActive', title: '二步验证', width: '110px' },
  { key: 'regTime', title: '注册时间', width: '160px' },
  { key: 'authDevice', title: 'PassKey', width: '130px' },
  { key: 'operate', title: '操作', sortable: false, width: '170px' },
]

const serverItems = ref<UserInfo[]>([])
const totalItems = ref(0)
const loading = ref(false)

const refreshItems = () =>
  loadItems({ page: 1, pageSize: 10, sortBy: 'id', sortDesc: false, search: '' })

const loadItems = async (p: {
  page: number
  pageSize: number
  sortBy: string
  sortDesc: boolean
  search: string
}) => {
  try {
    loading.value = true
    const { data } = await getUserListApi(p.page, p.pageSize, p.sortBy, p.sortDesc, p.search)
    serverItems.value = data.users
    totalItems.value = data.totalCount
  } catch (err: any) {
    console.error(err)
    showMsg(err.message, 'red')
  } finally {
    loading.value = false
  }
}

const toDelete = async (item: UserInfo) => {
  if (isSuperTarget(item)) return showMsg('超级管理员不可删除', 'red')
  if (item.role === 'admin' && !isSuper.value) return showMsg('无权限删除管理员账户', 'red')
  const flag = await openConfirmDialog('警告', `你确定要删除用户 ${item.username} ？此操作不可逆转！`)
  if (!flag) return
  const { msg } = await delUserApi(item)
  refreshItems()
  return showMsg(msg, 'green')
}

// 导出指定用户的数据包，由系统发送至其绑定邮箱。
const toExport = async (item: UserInfo) => {
  try {
    await openConfirmDialog(
      '导出数据',
      `将导出用户 ${item.username} 的全部数据，并发送至邮箱 ${item.email}，确定继续？`
    )
  } catch {
    return
  }
  try {
    const { msg } = await exportUserDataApi(item.id)
    showMsg(msg, 'green')
  } catch (err: any) {
    showMsg(err?.message ?? '导出失败', 'red')
  }
}

// 向指定用户发送站内私信。
const msgDialog = ref(false)
const msgSending = ref(false)
const msgForm = ref<{ uid: number; username: string; title: string; content: string }>({
  uid: 0,
  username: '',
  title: '',
  content: '',
})

const openMsg = (item: UserInfo) => {
  msgForm.value = { uid: item.id, username: item.username, title: '', content: '' }
  msgDialog.value = true
}

const sendMsg = async () => {
  if (!msgForm.value.title.trim() || !msgForm.value.content.trim()) {
    showMsg('标题与内容不能为空', 'red')
    return
  }
  msgSending.value = true
  try {
    const { msg } = await sendUserMessageApi(
      msgForm.value.uid,
      msgForm.value.title.trim(),
      msgForm.value.content.trim()
    )
    showMsg(msg, 'green')
    msgDialog.value = false
  } catch (err: any) {
    showMsg(err?.message ?? '发送失败', 'red')
  } finally {
    msgSending.value = false
  }
}
</script>

<template>
  <div class="users">
    <div class="users-head">
      <div>
        <h1 class="users-title">用户管理</h1>
        <p class="users-subtitle">共 {{ totalItems }} 位用户</p>
      </div>
      <div class="users-actions">
        <M3Button variant="text" size="sm" icon="refresh" :loading="loading" @click="refreshItems">
          刷新
        </M3Button>
        <M3Button variant="filled" size="sm" icon="person_add" @click="oUserDialog?.openDialog()">
          添加用户
        </M3Button>
      </div>
    </div>

    <DataTable
      :headers="headers"
      :items="serverItems"
      :total="totalItems"
      :loading="loading"
      @load="loadItems"
    >
      <template #item.email="{ item }">
        <CopyTool :text="item.email">
          <template #default="{ act }">
            <span v-bind="act" class="table-ellipsis">{{ item.email }}</span>
          </template>
        </CopyTool>
      </template>

      <template #item.role="{ item }">
        <M3Chip v-if="item.role === 'superadmin'" size="sm" variant="error" icon="star">
          {{ roleLabel(item.role) }}
        </M3Chip>
        <M3Chip v-else-if="item.role === 'admin'" size="sm" variant="tertiary">
          {{ roleLabel(item.role) }}
        </M3Chip>
        <span v-else>{{ roleLabel(item.role) }}</span>
      </template>

      <template #item.status="{ item }">
        <M3Chip size="sm" :variant="item.status === UserStatus.NORMAL ? 'tertiary' : 'error'">
          {{ userStatus[item.status ?? -1] }}
        </M3Chip>
      </template>

      <template #item.otpActive="{ item }">
        <M3Chip size="sm" :variant="item.otpActive ? 'tertiary' : 'outlined'">
          {{ item.otpActive ? '已开启' : '未开启' }}
        </M3Chip>
      </template>

      <template #item.regTime="{ item }">
        {{ new Date(Number(item.regTime)).toLocaleString() }}
      </template>

      <template #item.authDevice="{ item }">
        <M3Chip v-if="item.authDevice" size="sm" variant="primary">
          已绑定（{{ JSON.parse(item.authDevice as unknown as string).length }} 个）
        </M3Chip>
        <M3Chip v-else size="sm" variant="outlined">未绑定</M3Chip>
      </template>

      <template #item.operate="{ item }">
        <div class="row-ops">
          <M3IconButton icon="mail" label="发送站内私信" size="sm" @click="openMsg(item)" />
          <M3IconButton icon="download" label="导出数据至用户邮箱" size="sm" @click="toExport(item)" />
          <M3IconButton
            icon="edit"
            label="编辑用户"
            size="sm"
            :disabled="!canEdit(item)"
            @click="oUserDialog?.openDialog(item)"
          />
          <M3IconButton
            icon="delete"
            label="删除用户"
            size="sm"
            :disabled="!canDelete(item)"
            class="is-danger"
            @click="toDelete(item)"
          />
        </div>
      </template>
    </DataTable>

    <oUser ref="oUserDialog" :is-super="isSuper" :self-id="info?.id" @update="refreshItems" />

    <M3Dialog v-model="msgDialog" :title="`发送私信给 ${msgForm.username}`" size="sm">
      <M3TextField v-model="msgForm.title" label="标题" :maxlength="120" autofocus />
      <M3Textarea v-model="msgForm.content" label="内容" :rows="5" :maxlength="2000" />
      <template #actions>
        <M3Button variant="text" size="sm" @click="msgDialog = false">取消</M3Button>
        <M3Button variant="filled" size="sm" :loading="msgSending" @click="sendMsg">发送</M3Button>
      </template>
    </M3Dialog>
  </div>
</template>

<style scoped>
.users {
  display: flex;
  flex-direction: column;
  gap: var(--m3e-space-4);
}

.users-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--m3e-space-3);
}

.users-title {
  margin: 0;
  font: var(--m3e-type-headline-medium);
}

.users-subtitle {
  margin: 2px 0 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
}

.users-actions {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-2);
}

.table-ellipsis {
  display: block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-ops {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
}

.row-ops .is-danger {
  color: var(--error);
}
</style>
