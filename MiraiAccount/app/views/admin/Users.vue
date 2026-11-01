<script lang="ts" setup>
import { ref, computed } from 'vue'
import { indexStore } from '@/stores'
import { userStore } from '@/stores/user'
import { getUserListApi, delUserApi, exportUserDataApi } from '@/apis/user'
import { sendUserMessageApi } from '@/apis/message'
import _ from 'lodash'
import { type UserInfo, UserStatus } from '@/types'
import { userStatus } from '@/types/const'
import { roleLabel } from '@/utils/role'
import oUser from './dialog/oUser.vue'

const oUserDialog = ref<InstanceType<typeof oUser>>()
const { showMsg, openConfirmDialog } = indexStore()
const { info } = userStore()
const itemsPerPage = ref(10)
const search = ref('')

// 仅超级管理员可设置管理员权限；超级管理员自身受保护，只在权限组/状态上锁定。
const isSuper = computed(() => info?.role === 'superadmin')
const isSuperTarget = (item: UserInfo) => item.role === 'superadmin'
// 编辑权限：超管可编辑一切；普通用户任何管理员可编辑；管理员账户仅超管或本人可编辑。
const canEdit = (item: UserInfo) =>
  isSuper.value ||
  (item.role !== 'admin' && item.role !== 'superadmin') ||
  item.id === info?.id
// 删除权限：超管不可删；管理员仅超管可删。
const canDelete = (item: UserInfo) =>
  item.role !== 'superadmin' && (isSuper.value || item.role !== 'admin')

const headers = ref([
  { key: 'id', title: 'ID' },
  { key: 'username', title: '用户名', width: '120px' },
  { key: 'email', title: '绑定邮箱', width: '180px' },
  { key: 'role', title: '权限组', width: '100px' },
  { key: 'status', title: '状态', width: '100px' },
  { key: 'otpActive', title: '二步验证', width: '110px' },
  { key: 'regTime', title: '注册时间', width: '120px' },
  { key: 'authDevice', title: 'PassKey', width: '130px' },
  // 操作列固定宽度：4 个图标按钮约 140px + 单元格内边距，不给宽度会被表格压窄后换行错位。
  { key: 'operate', title: '操作', sortable: false, width: '180px' }
])

const serverItems = ref<UserInfo[]>([])
const totalItems = ref(10)
const currentPage = ref(1)
const _sortBy = ref<Array<{ key: string; order: string }>>([{ key: 'id', order: 'asc' }])
const loading = ref(false)

const loadItems = _.throttle(
  async ({
    page,
    itemsPerPage,
    sortBy
  }: {
    page: number
    itemsPerPage: number
    sortBy: Array<{ key: string; order: string }>
  }) => {
    try {
      loading.value = true
      currentPage.value = page
      _sortBy.value = sortBy
      const { data } = await getUserListApi(
        page,
        itemsPerPage,
        sortBy.length > 0 ? sortBy[0].key : 'id',
        sortBy.length > 0 ? sortBy[0].order === 'desc' : false,
        search.value
      )
      loading.value = false
      serverItems.value = data.users
      totalItems.value = data.totalCount
    } catch (err: any) {
      loading.value = false
      console.error(err)
      showMsg(err.message, 'red')
    }
  },
  1000
)

const refreshItems = () =>
  loadItems({
    page: currentPage.value,
    itemsPerPage: itemsPerPage.value,
    sortBy: _sortBy.value
  })

const toDelete = async (item: UserInfo) => {
  if (isSuperTarget(item)) return showMsg('超级管理员不可删除', 'red')
  if (item.role === 'admin' && !isSuper.value) return showMsg('无权限删除管理员账户', 'red')
  const flag = await openConfirmDialog(
    '警告',
    `你确定要删除用户 ${item.username} ？此操作不可逆转！`
  )
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

// 向指定用户发送站内私信，出现在其右下角消息列表中。
const msgDialog = ref(false)
const msgSending = ref(false)
const msgForm = ref<{ uid: number; username: string; title: string; content: string }>({
  uid: 0,
  username: '',
  title: '',
  content: ''
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
  <div>
    <div class="d-flex flex-wrap align-center ga-3">
      <div class="me-auto text-h6">
        用户管理 <small>( {{ totalItems }} )</small>
      </div>

      <div class="d-flex align-center ga-4">
        <v-text-field
          style="min-width: 30vw"
          v-model:model-value="search"
          label="搜索"
          clearable
          density="compact"
          append-inner-icon="mdi-magnify"
          hide-details
          :disabled="!!search && search.length === 0 && loading"
        ></v-text-field>
        <v-btn
          @click="refreshItems"
          :loading="loading"
          prepend-icon="mdi-refresh"
          variant="outlined"
          color="primary"
          >刷新</v-btn
        >
        <v-btn
          @click="oUserDialog?.openDialog()"
          prepend-icon="mdi-account-plus-outline"
          variant="tonal"
          color="primary"
          >添加用户</v-btn
        >
      </div>
    </div>
    <v-card class="mt-5" variant="outlined">
      <v-card-text>
        <v-data-table-server
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items-length="totalItems"
          :items="serverItems"
          :loading="loading"
          :search="search"
          hover
          color="transparent"
          @update:options="loadItems"
        >
          <template v-slot:[`item.email`]="{ item }">
            <CopyTool :text="item.email">
              <template #default="{ copy, style, act }">
                <span v-bind="act" @click="copy" :style="style" class="truncate d-block">{{
                  item.email
                }}</span>
              </template>
            </CopyTool>
          </template>
          <template v-slot:[`item.role`]="{ item }">
            <v-chip
              v-if="item.role === 'superadmin'"
              color="red"
              prepend-icon="mdi-crown-outline"
              size="small"
            >
              {{ roleLabel(item.role) }}
            </v-chip>
            <span v-else :class="item.role === 'admin' ? 'text-orange' : ''">
              {{ roleLabel(item.role) }}
            </span>
          </template>
          <template v-slot:[`item.status`]="{ item }">
            <v-chip :color="item.status === UserStatus.NORMAL ? 'green' : 'red'">
              {{ userStatus[item.status ?? -1] }}
            </v-chip>
          </template>
          <template v-slot:[`item.otpActive`]="{ item }">
            <v-chip
              v-if="item.otpActive"
              color="green"
              size="small"
              prepend-icon="mdi-shield-check-outline"
            >
              已开启
            </v-chip>
            <v-chip v-else color="red" size="small" prepend-icon="mdi-shield-off-outline">
              未开启
            </v-chip>
          </template>
          <template v-slot:[`item.regTime`]="{ item }">
            {{ new Date(Number(item.regTime)).toLocaleString() }}
          </template>
          <template v-slot:[`item.authDevice`]="{ item }">
            <v-chip v-if="item.authDevice" color="green" prepend-icon="mdi-shield-lock-outline">
              已绑定（{{ JSON.parse(item.authDevice as unknown as string).length }}个）
            </v-chip>
            <v-chip v-else color="red" prepend-icon="mdi-shield-off-outline"> 未绑定 </v-chip>
          </template>
          <template v-slot:[`item.operate`]="{ item }">
            <!-- 单行等距排列：禁止换行，避免宽度不足时按钮折成两排、视觉上错位 -->
            <div class="d-flex align-center flex-nowrap ga-1">
              <v-btn
                icon="mdi-email-edit-outline"
                variant="text"
                size="small"
                color="primary"
                title="发送站内私信"
                @click="openMsg(item)"
              ></v-btn>
              <v-btn
                icon="mdi-export-variant"
                variant="text"
                size="small"
                color="primary"
                title="导出数据至用户邮箱"
                @click="toExport(item)"
              ></v-btn>
              <v-btn
                icon="mdi-pencil-outline"
                variant="text"
                size="small"
                color="primary"
                :disabled="!canEdit(item)"
                :title="
                  !canEdit(item) ? (isSuperTarget(item) ? '超管账户仅超级管理员可编辑' : '管理员账户仅超级管理员可编辑') : ''
                "
                @click="oUserDialog?.openDialog(item)"
              ></v-btn>
              <v-btn
                icon="mdi-trash-can-outline"
                variant="text"
                size="small"
                color="red"
                :disabled="!canDelete(item)"
                :title="
                  !canDelete(item) ? (isSuperTarget(item) ? '超级管理员不可删除' : '管理员账户仅超级管理员可删除') : ''
                "
                @click="toDelete(item)"
              ></v-btn>
            </div>
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>

    <oUser ref="oUserDialog" :is-super="isSuper" :self-id="info?.id" @update="refreshItems" />

    <v-dialog v-model="msgDialog" max-width="520">
      <v-card :title="`发送私信给 ${msgForm.username}`" variant="flat">
        <v-card-text>
          <v-text-field
            v-model="msgForm.title"
            label="标题"
            density="compact"
            maxlength="120"
            hide-details
            class="mb-3"
          ></v-text-field>
          <v-textarea
            v-model="msgForm.content"
            label="内容"
            rows="4"
            maxlength="2000"
            hide-details
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="msgDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="msgSending" @click="sendMsg">发送</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
