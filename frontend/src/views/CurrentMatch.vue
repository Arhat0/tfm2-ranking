<template>
  <div class="max-w-2xl mx-auto fade-in">
    <!-- 无对局 -->
    <div v-if="!match" class="text-center py-16">
      <div class="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-10 h-10 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-white mb-2">当前没有进行中的对局</h2>
      <p class="text-dark-400 mb-6">去匹配一场新的排位赛吧</p>
      <router-link
        to="/matchmaking"
        class="inline-block px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
      >
        开始匹配
      </router-link>
    </div>

    <!-- 对局详情 -->
    <div v-else class="space-y-6">
      <!-- 状态标题 -->
      <div class="text-center">
        <div
          class="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-2"
          :class="statusBadgeClass"
        >
          {{ statusText }}
        </div>
        <h1 class="text-2xl font-bold text-white">
          {{ match.status === 'waiting' ? '公开房间 #' + match.id : '对局 #' + match.id }}
        </h1>
      </div>

      <!-- 双方信息 -->
      <div class="bg-dark-800 rounded-xl p-6 border border-dark-700">
        <div v-if="match.status === 'waiting'" class="text-center py-4">
          <div class="w-16 h-16 bg-primary-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-8 h-8 text-primary-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <p class="text-white font-medium">等待其他玩家加入...</p>
          <p class="text-dark-400 text-sm mt-1">房间已公开，其他玩家可在大厅加入</p>
        </div>

        <div v-else class="flex items-center justify-between">
          <div class="text-center flex-1">
            <UserAvatar :avatar="match.opponent?.avatar" :name="match.opponent?.gameId" size="xl" class="mx-auto mb-2" />
            <div class="font-semibold text-white text-lg">{{ match.opponent?.gameId }}</div>
            <div class="text-sm text-dark-400">{{ match.opponent?.username }}</div>
          </div>

          <div class="px-4">
            <div class="text-3xl font-bold text-dark-500">VS</div>
          </div>

          <div class="text-center flex-1">
            <UserAvatar :avatar="profile?.avatar" :name="profile?.gameId" size="xl" class="mx-auto mb-2" />
            <div class="font-semibold text-white text-lg">{{ profile?.gameId }}（你）</div>
            <div class="text-sm text-dark-400">{{ profile?.username }}</div>
          </div>
        </div>

        <!-- 房间标题 -->
        <div v-if="['pending', 'in_progress', 'waiting'].includes(match.status)" class="mt-6 pt-6 border-t border-dark-700">
          <div class="text-center">
            <div class="text-sm text-dark-400 mb-1">房间标题（房名）</div>
            <div class="text-2xl font-bold text-primary-400 tracking-widest">{{ match.roomPassword }}</div>
            <div class="text-xs text-dark-500 mt-1">请在游戏内使用此标题创建房间，对手在房间列表中找到并加入</div>
          </div>
        </div>
      </div>

      <!-- waiting: 等待加入 -->
      <div v-if="match.status === 'waiting'" class="bg-dark-800 rounded-xl p-6 border border-dark-700 text-center">
        <p class="text-dark-300 mb-4">等待其他玩家加入你的房间</p>
        <button
          @click="handleCancel"
          class="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
        >
          取消房间
        </button>
        <router-link
          to="/"
          class="block mx-auto mt-3 text-sm text-primary-400 hover:text-primary-300 transition-colors"
        >
          返回大厅查看
        </router-link>
      </div>

      <!-- pending: 等待开始 -->
      <div v-if="match.status === 'pending'" class="bg-dark-800 rounded-xl p-6 border border-dark-700 text-center">
        <p class="text-dark-300 mb-4">双方进入游戏后，点击下方按钮开始比赛</p>
        <button
          @click="handleStart"
          class="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
        >
          我已进入游戏，开始比赛
        </button>
        <button
          @click="handleCancel"
          class="block mx-auto mt-3 text-sm text-dark-400 hover:text-red-400 transition-colors"
        >
          取消对局
        </button>
      </div>

      <!-- in_progress: 进行中，上报比分 -->
      <div v-if="match.status === 'in_progress'" class="bg-dark-800 rounded-xl p-6 border border-dark-700">
        <h3 class="text-lg font-semibold text-white mb-4 text-center">比赛结束？上报比分</h3>

        <!-- 快捷比分 -->
        <div class="mb-5">
          <div class="text-xs text-dark-400 mb-2 text-center">快捷选择</div>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="s in quickScores"
              :key="s.label"
              @click="applyQuickScore(s)"
              :class="isQuickScoreActive(s) ? 'bg-primary-600 border-primary-500 text-white' : 'bg-dark-900 border-dark-600 text-dark-300 hover:bg-dark-700 hover:border-dark-500'"
              class="px-2 py-2 rounded-lg text-sm font-medium transition-colors border"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- 比分步进器 -->
        <div class="flex items-center justify-center gap-4 mb-5">
          <div class="flex-1 text-center">
            <div class="text-xs text-dark-400 mb-2">{{ profile?.username }}（你）</div>
            <div class="flex items-center justify-center gap-2">
              <button
                @click="myScore = Math.max(0, myScore - 1)"
                class="w-10 h-10 rounded-lg bg-dark-900 border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-white text-xl font-bold transition-colors flex items-center justify-center"
              >−</button>
              <div class="w-16 h-14 flex items-center justify-center bg-dark-900 border border-dark-600 rounded-lg">
                <span class="text-3xl font-bold" :class="autoWinnerIsMe ? 'text-green-400' : 'text-white'">{{ myScore }}</span>
              </div>
              <button
                @click="myScore = Math.min(9, myScore + 1)"
                class="w-10 h-10 rounded-lg bg-dark-900 border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-white text-xl font-bold transition-colors flex items-center justify-center"
              >+</button>
            </div>
          </div>

          <div class="text-3xl font-bold text-dark-500 pt-5">:</div>

          <div class="flex-1 text-center">
            <div class="text-xs text-dark-400 mb-2">{{ match.opponent?.username }}</div>
            <div class="flex items-center justify-center gap-2">
              <button
                @click="opponentScore = Math.max(0, opponentScore - 1)"
                class="w-10 h-10 rounded-lg bg-dark-900 border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-white text-xl font-bold transition-colors flex items-center justify-center"
              >−</button>
              <div class="w-16 h-14 flex items-center justify-center bg-dark-900 border border-dark-600 rounded-lg">
                <span class="text-3xl font-bold" :class="!autoWinnerIsMe && hasValidScore ? 'text-red-400' : 'text-white'">{{ opponentScore }}</span>
              </div>
              <button
                @click="opponentScore = Math.min(9, opponentScore + 1)"
                class="w-10 h-10 rounded-lg bg-dark-900 border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-white text-xl font-bold transition-colors flex items-center justify-center"
              >+</button>
            </div>
          </div>
        </div>

        <!-- 自动胜者提示 -->
        <div class="text-center mb-4">
          <div v-if="hasValidScore" class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
            :class="autoWinnerIsMe ? 'bg-green-600/20 text-green-400 border border-green-600/40' : 'bg-red-600/20 text-red-400 border border-red-600/40'">
            <span>{{ autoWinnerIsMe ? '你获胜' : '对手获胜' }}</span>
          </div>
          <div v-else class="text-sm text-dark-500">比分不能相同，请调整</div>
        </div>

        <!-- 英雄 BP 上报 -->
        <div class="mb-5 bg-dark-900 rounded-xl border border-dark-700 overflow-hidden">
          <button
            @click="showHeroForm = !showHeroForm"
            class="w-full px-4 py-3 flex items-center justify-between text-left transition-colors hover:bg-dark-800"
          >
            <span class="font-semibold text-white">🛡️ 英雄 BP 数据（选/禁 + 伤害）</span>
            <span class="text-xs text-dark-400">{{ showHeroForm ? '收起 ▲' : '展开 ▼' }} <span class="ml-1">（选填）</span></span>
          </button>

          <div v-if="showHeroForm" class="p-4 space-y-5">
            <!-- 通用设置：禁用数 + 手动填写提示 -->
            <div class="flex items-center gap-3 flex-wrap bg-dark-800 rounded-lg px-3 py-2 border border-dark-700">
              <div class="flex items-center gap-2">
                <span class="text-xs text-dark-300">每队禁用数：</span>
                <select
                  v-model.number="banCount"
                  @change="resizeBans"
                  class="px-2 py-1 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white focus:outline-none"
                >
                  <option :value="0">0 个</option>
                  <option :value="1">1 个</option>
                  <option :value="2">2 个</option>
                  <option :value="3">3 个</option>
                  <option :value="4">4 个</option>
                  <option :value="5">5 个</option>
                  <option :value="6">6 个</option>
                </select>
              </div>
              <span class="text-xs text-primary-300">💡 可直接手动填写英雄与伤害数字，无需等待截图识别</span>
            </div>

            <!-- 我的队伍 -->
            <div>
              <div class="text-sm font-semibold text-primary-400 mb-3">我的队伍（{{ profile?.username }}）</div>
              <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-2">
                <div v-for="(slot, i) in myPicks" :key="'mp' + i" class="bg-dark-800 rounded-lg p-2.5 border border-dark-700">
                  <div class="text-xs text-dark-400 mb-1.5">选人 {{ i + 1 }}</div>
                  <HeroPicker
                    :model-value="myPicks[i].heroId"
                    :heroes="heroes"
                    :heroes-loading="heroesLoading"
                    @update:model-value="myPicks[i].heroId = $event"
                    @retry="loadHeroes"
                  />
                  <div class="flex gap-1.5 mt-1.5">
                    <input
                      v-model.number="myPicks[i].damageDealt"
                      type="number"
                      min="0"
                      placeholder="造成"
                      class="w-1/2 px-1.5 py-1 bg-dark-900 border border-dark-600 rounded text-xs text-orange-300 placeholder-dark-600 focus:outline-none"
                    />
                    <input
                      v-model.number="myPicks[i].damageTaken"
                      type="number"
                      min="0"
                      placeholder="承受"
                      class="w-1/2 px-1.5 py-1 bg-dark-900 border border-dark-600 rounded text-xs text-red-300 placeholder-dark-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-dark-400 shrink-0">禁用：</span>
                <HeroPicker
                  v-for="(b, i) in myBans"
                  :key="'mb' + i"
                  :model-value="myBans[i]"
                  :heroes="heroes"
                  :heroes-loading="heroesLoading"
                  placeholder="— 选择禁用 —"
                  @update:model-value="myBans[i] = $event"
                  @retry="loadHeroes"
                  class="flex-1"
                />
              </div>
            </div>

            <!-- 对手队伍 -->
            <div class="pt-4 border-t border-dark-700">
              <div class="text-sm font-semibold text-red-400 mb-3">对手队伍（{{ match?.opponent?.username }}）</div>
              <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-2">
                <div v-for="(slot, i) in oppPicks" :key="'op' + i" class="bg-dark-800 rounded-lg p-2.5 border border-dark-700">
                  <div class="text-xs text-dark-400 mb-1.5">选人 {{ i + 1 }}</div>
                  <HeroPicker
                    :model-value="oppPicks[i].heroId"
                    :heroes="heroes"
                    :heroes-loading="heroesLoading"
                    @update:model-value="oppPicks[i].heroId = $event"
                    @retry="loadHeroes"
                  />
                  <div class="flex gap-1.5 mt-1.5">
                    <input
                      v-model.number="oppPicks[i].damageDealt"
                      type="number"
                      min="0"
                      placeholder="造成"
                      class="w-1/2 px-1.5 py-1 bg-dark-900 border border-dark-600 rounded text-xs text-orange-300 placeholder-dark-600 focus:outline-none"
                    />
                    <input
                      v-model.number="oppPicks[i].damageTaken"
                      type="number"
                      min="0"
                      placeholder="承受"
                      class="w-1/2 px-1.5 py-1 bg-dark-900 border border-dark-600 rounded text-xs text-red-300 placeholder-dark-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-dark-400 shrink-0">禁用：</span>
                <HeroPicker
                  v-for="(b, i) in oppBans"
                  :key="'ob' + i"
                  :model-value="oppBans[i]"
                  :heroes="heroes"
                  :heroes-loading="heroesLoading"
                  placeholder="— 选择禁用 —"
                  @update:model-value="oppBans[i] = $event"
                  @retry="loadHeroes"
                  class="flex-1"
                />
              </div>
            </div>

            <p class="text-xs text-dark-500">伤害数据可在游戏结算界面查看；每队可上报 5 名上场英雄与禁用英雄（禁用数可调整）</p>
          </div>
        </div>

        <!-- 📷 对局截图识别 -->
        <div class="mb-5 bg-dark-900 rounded-xl border border-dark-700 overflow-hidden">
          <button
            @click="showShotForm = !showShotForm"
            class="w-full px-4 py-3 flex items-center justify-between text-left transition-colors hover:bg-dark-800"
          >
            <span class="font-semibold text-white">📷 对局截图识别（自动识别伤害数据）</span>
            <span class="text-xs text-dark-400">{{ showShotForm ? '收起 ▲' : '展开 ▼' }} <span class="ml-1">（选填）</span></span>
          </button>

          <div v-if="showShotForm" class="p-4 space-y-4">
            <!-- 上传 -->
            <div class="flex items-center gap-3 flex-wrap">
              <input
                ref="shotInput"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="hidden"
                @change="onShotSelected"
              />
              <button
                @click="$refs.shotInput.click()"
                class="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                选择截图
              </button>
              <span v-if="selectedShotName" class="text-xs text-dark-300">{{ selectedShotName }}</span>
              <button
                v-if="selectedShot"
                @click="handleUploadShot"
                :disabled="uploadingShot"
                class="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-dark-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {{ uploadingShot ? '上传中...' : '上传截图' }}
              </button>
              <button
                v-if="shotUploaded"
                @click="handleOcr"
                :disabled="ocrBusy"
                class="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-dark-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {{ ocrBusy ? '识别中...' : '🔍 识别伤害数字' }}
              </button>
            </div>

            <!-- 截图预览 -->
            <div v-if="shotPreviewUrl" class="rounded-lg overflow-hidden border border-dark-700 max-w-sm">
              <img :src="shotPreviewUrl" class="w-full" alt="对局截图" />
            </div>

            <!-- OCR 结果 -->
            <div v-if="ocrResults.length > 0" class="space-y-3">
              <div class="text-xs text-dark-400">
                已按截图位置识别 10 个“总造成伤害”区域。不会读取右侧 KDA、金币、CS 等无关数字。
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div
                  v-for="r in ocrResults"
                  :key="`${r.side}-${r.index}`"
                  class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-dark-800 border border-dark-700"
                >
                  <div class="min-w-0">
                    <div class="text-xs text-dark-300">{{ r.side === 'me' ? '我方' : '对方' }} · 选人 {{ r.index }}</div>
                    <div class="text-sm text-white truncate">{{ r.heroName || '尚未选择英雄' }}</div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="text-base font-bold font-mono" :class="r.confidence >= 80 ? 'text-orange-300' : 'text-yellow-300'">
                      {{ r.damage === null ? '识别失败' : formatDamage(r.damage) }}
                    </div>
                    <div v-if="r.damage !== null" class="text-[10px] text-dark-500">置信度 {{ Math.round(r.confidence) }}%</div>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button
                  @click="autoFillDamage"
                  :disabled="!ocrResults.some(r => r.damage !== null)"
                  class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-dark-700 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  ⚡ 按截图位置自动填入“造成伤害”
                </button>
                <button
                  @click="clearOcrDamage"
                  class="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  清除本次识别
                </button>
              </div>
              <p class="text-xs text-dark-500">
                这张结算图只能直接得到“造成伤害”。“承受伤害”不在截图的同一字段中，因此不会用 OCR 数字乱填；识别后仍建议核对。
              </p>
            </div>
            <div v-else-if="ocrBusy" class="text-xs text-dark-400 animate-pulse">正在按 10 个英雄行区域识别伤害，请稍候...</div>
          </div>
        </div>

        <button
          @click="handleReport"
          :disabled="reporting || !hasValidScore"
          class="w-full px-8 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
        >
          {{ reporting ? '提交中...' : '提交比分' }}
        </button>

        <button
          @click="handleCancel"
          class="block mx-auto mt-4 text-sm text-dark-400 hover:text-red-400 transition-colors"
        >
          取消对局（开始后5分钟内有效）
        </button>
      </div>

      <!-- awaiting_confirmation: 等待确认 -->
      <div v-if="match.status === 'awaiting_confirmation'" class="bg-dark-800 rounded-xl p-6 border border-dark-700">
        <div class="text-center mb-4">
          <h3 class="text-lg font-semibold text-white">等待结果确认</h3>
          <p class="text-dark-400 text-sm mt-1">
            {{ isReporter ? '你已上报比分，等待对手确认' : '对手已上报比分，请确认结果' }}
          </p>
        </div>

        <!-- 上报的比分 -->
        <div class="bg-dark-900 rounded-lg p-4 mb-4">
          <div class="text-center">
            <div class="text-sm text-dark-400 mb-1">上报比分</div>
            <div class="text-3xl font-bold text-white">
              {{ match.result?.score }}
            </div>
            <div class="text-sm mt-2" :class="reportedWinnerIsMe ? 'text-green-400' : 'text-red-400'">
              {{ reportedWinnerIsMe ? '你获胜' : '对手获胜' }}
            </div>
          </div>
        </div>

        <!-- 非上报方需要确认 -->
        <div v-if="!isReporter">
          <div class="grid grid-cols-2 gap-3">
            <button
              @click="handleConfirm(true)"
              :disabled="confirming"
              class="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-bold rounded-lg transition-colors"
            >
              确认结果
            </button>
            <button
              @click="handleConfirm(false)"
              :disabled="confirming"
              class="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-bold rounded-lg transition-colors"
            >
              提出争议
            </button>
          </div>
          <p class="text-xs text-dark-500 text-center mt-3">
            如有异议请点击"提出争议"，管理员将介入处理
          </p>
        </div>

        <!-- 上报方显示等待 -->
        <div v-else class="text-center">
          <div class="inline-flex items-center gap-2 text-dark-400">
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            等待对手确认中...
          </div>
          <p class="text-xs text-dark-500 mt-2">若对手24小时内未确认，将自动视为确认</p>
        </div>
      </div>

      <!-- disputed: 争议中 -->
      <div v-if="match.status === 'disputed'" class="bg-yellow-900/30 border border-yellow-700 rounded-xl p-6 text-center">
        <div class="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-yellow-400">对局存在争议</h3>
        <p class="text-yellow-200/70 text-sm mt-2">管理员正在处理，请耐心等待</p>
      </div>

      <!-- completed: 已完成 -->
      <div v-if="match.status === 'completed'" class="bg-dark-800 rounded-xl p-6 border border-dark-700 text-center">
        <div
          class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
          :class="isWinner ? 'bg-green-600' : 'bg-red-600'"
        >
          <span class="text-3xl">{{ isWinner ? '🏆' : '💔' }}</span>
        </div>
        <h3 class="text-xl font-bold" :class="isWinner ? 'text-green-400' : 'text-red-400'">
          {{ isWinner ? '胜利！' : '失败' }}
        </h3>
        <p class="text-dark-400 mt-1">比分：{{ match.result?.score }}</p>
      </div>

      <!-- cancelled: 已取消 -->
      <div v-if="match.status === 'cancelled'" class="bg-dark-800 rounded-xl p-6 border border-dark-700 text-center">
        <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white">对局已取消</h3>
        <router-link to="/matchmaking" class="inline-block mt-4 text-primary-400 hover:text-primary-300">
          重新匹配 →
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMatchStore } from '../stores/match'
import { useToastStore } from '../stores/toast'
import { getSocket } from '../api/socket'
import { heroStatsApi, matchApi } from '../api'
import UserAvatar from '../components/UserAvatar.vue'
import HeroPicker from '../components/HeroPicker.vue'
import { createWorker } from 'tesseract.js'

const router = useRouter()
const authStore = useAuthStore()
const matchStore = useMatchStore()
const toastStore = useToastStore()

// 截图识别状态
const showShotForm = ref(false)
const selectedShot = ref(null)
const selectedShotName = ref('')
const shotPreviewUrl = ref('')
const shotUploaded = ref(false)
const shotId = ref(null)
const uploadingShot = ref(false)
const ocrBusy = ref(false)
const ocrResults = ref([])
let ocrWorker = null

function onShotSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  selectedShot.value = file
  selectedShotName.value = file.name
  shotUploaded.value = false
  shotId.value = null
  ocrResults.value = []
  if (shotPreviewUrl.value) URL.revokeObjectURL(shotPreviewUrl.value)
  shotPreviewUrl.value = URL.createObjectURL(file)
}

async function handleUploadShot() {
  if (!selectedShot.value || !match.value) return
  uploadingShot.value = true
  try {
    const res = await matchApi.uploadScreenshot(match.value.id, selectedShot.value)
    shotId.value = res.data.screenshot.id
    shotUploaded.value = true
    toastStore.success('截图已上传')
  } catch (err) {
    toastStore.error(err.response?.data?.error || '上传失败')
  } finally {
    uploadingShot.value = false
  }
}

async function getOcrWorker() {
  if (ocrWorker) return ocrWorker
  ocrWorker = await createWorker('eng', 1, {
    logger: () => {},
  })
  await ocrWorker.setParameters({
    tessedit_pageseg_mode: '7',
    tessedit_char_whitelist: '0123456789,',
  })
  return ocrWorker
}

/**
 * 固定结算页布局的 10 个“总造成伤害”数字区域。
 * 使用归一化坐标，因此截图缩放后仍能工作。
 * 该截图约为 1891x796：左列 x≈155~320，右列 x≈650~770，五行 y≈211/333/455/577/699。
 */
const DAMAGE_REGIONS = [
  { side: 'me', index: 1, x1: 0.082, x2: 0.169 },
  { side: 'me', index: 2, x1: 0.082, x2: 0.169 },
  { side: 'me', index: 3, x1: 0.082, x2: 0.169 },
  { side: 'me', index: 4, x1: 0.082, x2: 0.169 },
  { side: 'me', index: 5, x1: 0.082, x2: 0.169 },
  { side: 'opp', index: 1, x1: 0.344, x2: 0.407 },
  { side: 'opp', index: 2, x1: 0.344, x2: 0.407 },
  { side: 'opp', index: 3, x1: 0.344, x2: 0.407 },
  { side: 'opp', index: 4, x1: 0.344, x2: 0.407 },
  { side: 'opp', index: 5, x1: 0.344, x2: 0.407 },
]
const DAMAGE_Y = [0.286, 0.440, 0.593, 0.746, 0.900]

function getHeroName(heroId) {
  if (!heroId) return ''
  const hero = heroes.value.find((h) => Number(h.id) === Number(heroId))
  return hero?.name || hero?.displayName || ''
}

function formatDamage(n) {
  return Number(n || 0).toLocaleString('en-US')
}

function normalizeOcrDamage(text) {
  const cleaned = String(text || '')
    .replace(/[，]/g, ',')
    .replace(/[.]/g, '')
    .replace(/\s+/g, '')
  const matches = cleaned.match(/\d{1,3}(?:,\d{3})+|\d{3,7}/g) || []
  const candidates = matches
    .map((v) => Number(v.replace(/,/g, '')))
    .filter((n) => n >= 100 && n <= 999999)
  return candidates.length ? candidates[0] : null
}

function preprocessDamageRegion(canvas, region) {
  const ctx = canvas.getContext('2d')
  const w = Math.max(1, Math.round(canvas.width * (region.x2 - region.x1)))
  const h = Math.max(1, Math.round(canvas.height * 0.043))
  const x = Math.round(canvas.width * region.x1)
  const y = Math.round(canvas.height * DAMAGE_Y[region.index - 1] - h * 0.5)

  const out = document.createElement('canvas')
  out.width = w * 4
  out.height = h * 4
  const outCtx = out.getContext('2d')
  outCtx.imageSmoothingEnabled = true
  outCtx.drawImage(canvas, x, y, w, h, 0, 0, out.width, out.height)

  const imageData = outCtx.getImageData(0, 0, out.width, out.height)
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
    const v = gray < 130 ? 0 : 255
    d[i] = d[i + 1] = d[i + 2] = v
  }
  outCtx.putImageData(imageData, 0, 0)
  return out.toDataURL('image/png')
}

function loadImageCanvas(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas)
    }
    img.onerror = reject
    img.src = url
  })
}

async function recognizeDamageRegion(worker, sourceCanvas, region) {
  const processed = preprocessDamageRegion(sourceCanvas, region)
  const { data } = await worker.recognize(processed)
  const damage = normalizeOcrDamage(data.text)
  return {
    ...region,
    damage,
    confidence: damage === null ? 0 : Number(data.confidence || 0),
  }
}

async function handleOcr() {
  if (!shotPreviewUrl.value) return
  ocrBusy.value = true
  ocrResults.value = []
  try {
    const worker = await getOcrWorker()
    const sourceCanvas = await loadImageCanvas(shotPreviewUrl.value)
    const aspect = sourceCanvas.width / sourceCanvas.height
    if (aspect < 2.05 || aspect > 2.75) {
      toastStore.warning('截图比例与标准结算页差异较大，仍会尝试识别，但请重点核对结果')
    }

    const results = []
    for (const region of DAMAGE_REGIONS) {
      const result = await recognizeDamageRegion(worker, sourceCanvas, region)
      result.heroName = getHeroName(region.side === 'me' ? myPicks.value[region.index - 1]?.heroId : oppPicks.value[region.index - 1]?.heroId)
      results.push(result)
    }
    ocrResults.value = results

    // 保存原始识别结果留档，便于之后排查 OCR 误识别。
    if (shotId.value && results.length) {
      const ocrText = results.map((r) => `${r.side === 'me' ? '我方' : '对方'}${r.index}: ${r.damage ?? ''}`).join('\n')
      matchApi.saveOcr(match.value.id, shotId.value, ocrText).catch(() => {})
    }

    const successCount = results.filter((r) => r.damage !== null).length
    if (!successCount) {
      toastStore.warning('没有识别到伤害数字。请确认上传的是完整的结算界面截图')
    } else {
      toastStore.success(`已识别 ${successCount}/10 个英雄的造成伤害，可按截图位置自动填入`)
    }
  } catch (err) {
    console.error('OCR error:', err)
    toastStore.error('识别失败，请稍后重试')
  } finally {
    ocrBusy.value = false
  }
}

/** 按截图的左右两列 + 五行位置，把“造成伤害”写回对应选人槽位。 */
function autoFillDamage() {
  let filled = 0
  let skippedNoHero = 0
  let failed = 0
  for (const r of ocrResults.value) {
    if (r.damage === null) {
      failed++
      continue
    }
    const slots = r.side === 'me' ? myPicks.value : oppPicks.value
    const slot = slots[r.index - 1]
    if (!slot?.heroId) {
      skippedNoHero++
      continue
    }
    slot.damageDealt = r.damage
    filled++
  }
  if (filled) toastStore.success(`已按截图位置填入 ${filled} 个造成伤害${skippedNoHero ? `，${skippedNoHero} 个未选英雄已跳过` : ''}`)
  else toastStore.warning('没有可填入的英雄：请先按截图顺序选择 5 名我方/对方英雄')
  if (failed) toastStore.info(`${failed} 个区域识别失败，请手动填写`) 
}

function clearOcrDamage() {
  ocrResults.value = []
}

const profile = computed(() => authStore.profile)
const match = computed(() => matchStore.currentMatch)

const myScore = ref(2)
const opponentScore = ref(1)
const reporting = ref(false)
const confirming = ref(false)
const starting = ref(false)
const cancelling = ref(false)

// 英雄 BP 上报状态
const heroes = ref([])
const heroesLoading = ref(false)
const showHeroForm = ref(false)
const myPicks = ref([])
const myBans = ref([])
const oppPicks = ref([])
const oppBans = ref([])
const banCount = ref(parseInt(localStorage.getItem('tfm2_ban_count')) || 3)

async function loadHeroes() {
  heroesLoading.value = true
  try {
    const res = await heroStatsApi.list()
    heroes.value = res.data.heroes
  } catch (err) {
    // 静默失败，HeroPicker 中提供重试
  } finally {
    heroesLoading.value = false
  }
}

function emptySlot() {
  return { heroId: 0, damageDealt: null, damageTaken: null }
}

function initHeroForm() {
  myPicks.value = Array.from({ length: 5 }, () => emptySlot())
  myBans.value = Array.from({ length: banCount.value }, () => 0)
  oppPicks.value = Array.from({ length: 5 }, () => emptySlot())
  oppBans.value = Array.from({ length: banCount.value }, () => 0)
}

/** 调整禁用数量（保留已选值） */
function resizeBans() {
  const n = Math.max(0, Math.min(6, banCount.value || 0))
  localStorage.setItem('tfm2_ban_count', String(n))
  myBans.value = resizeArray(myBans.value, n)
  oppBans.value = resizeArray(oppBans.value, n)
}

function resizeArray(arr, n) {
  const next = Array.from({ length: n }, () => 0)
  for (let i = 0; i < Math.min(arr.length, n); i++) next[i] = arr[i]
  return next
}

function buildHeroData() {
  const picks = (slots) =>
    slots
      .filter((s) => s.heroId)
      .map((s) => ({
        heroId: s.heroId,
        damageDealt: parseInt(s.damageDealt) || 0,
        damageTaken: parseInt(s.damageTaken) || 0,
      }))
  const bans = (slots) => slots.filter((b) => b)

  return {
    me: { picks: picks(myPicks.value), bans: bans(myBans.value) },
    opponent: { picks: picks(oppPicks.value), bans: bans(oppBans.value) },
  }
}

// 快捷比分（BO3 + BO5 常见结果）
const quickScores = [
  { label: '2:0', my: 2, opp: 0 },
  { label: '2:1', my: 2, opp: 1 },
  { label: '1:2', my: 1, opp: 2 },
  { label: '0:2', my: 0, opp: 2 },
  { label: '3:0', my: 3, opp: 0 },
  { label: '3:1', my: 3, opp: 1 },
  { label: '3:2', my: 3, opp: 2 },
  { label: '2:3', my: 2, opp: 3 },
]

// 比分是否有效（不能相同）
const hasValidScore = computed(() => {
  return myScore.value !== opponentScore.value
})

// 根据比分自动判断胜者
const autoWinnerIsMe = computed(() => {
  return myScore.value > opponentScore.value
})

// 自动胜者 ID
const autoWinnerId = computed(() => {
  if (!hasValidScore.value) return null
  return autoWinnerIsMe.value ? profile.value?.id : match.value?.opponent?.id
})

function applyQuickScore(s) {
  myScore.value = s.my
  opponentScore.value = s.opp
}

function isQuickScoreActive(s) {
  return myScore.value === s.my && opponentScore.value === s.opp
}

const isReporter = computed(() => match.value?.reportedBy === profile.value?.id)

const reportedWinnerIsMe = computed(() => match.value?.winnerId === profile.value?.id)

const isWinner = computed(() => match.value?.winnerId === profile.value?.id)

const statusMap = {
  waiting: { text: '等待加入', class: 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/40' },
  pending: { text: '等待开始', class: 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/40' },
  in_progress: { text: '进行中', class: 'bg-blue-600/20 text-blue-400 border border-blue-600/40' },
  awaiting_confirmation: { text: '等待确认', class: 'bg-purple-600/20 text-purple-400 border border-purple-600/40' },
  completed: { text: '已完成', class: 'bg-green-600/20 text-green-400 border border-green-600/40' },
  disputed: { text: '争议中', class: 'bg-red-600/20 text-red-400 border border-red-600/40' },
  cancelled: { text: '已取消', class: 'bg-dark-600/20 text-dark-400 border border-dark-600/40' },
}

const statusText = computed(() => statusMap[match.value?.status]?.text || match.value?.status)
const statusBadgeClass = computed(() => statusMap[match.value?.status]?.class || '')

async function handleStart() {
  if (starting.value) return
  starting.value = true
  try {
    await matchStore.startMatch(match.value.id)
    toastStore.success('比赛已开始')
    await matchStore.fetchCurrentMatch()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '操作失败')
  } finally {
    starting.value = false
  }
}

async function handleReport() {
  if (!hasValidScore.value) {
    toastStore.warning('比分不能相同')
    return
  }

  reporting.value = true
  try {
    const score = `${myScore.value}:${opponentScore.value}`
    const heroData = buildHeroData()
    await matchStore.reportResult(match.value.id, score, autoWinnerId.value, heroData)
    toastStore.success('比分已上报，等待对手确认')
  } catch (err) {
    toastStore.error(err.response?.data?.error || '上报失败')
  } finally {
    reporting.value = false
  }
}

async function handleConfirm(agree) {
  confirming.value = true
  try {
    await matchStore.confirmResult(match.value.id, agree)
    if (agree) {
      toastStore.success('结果已确认，积分已结算')
    } else {
      toastStore.info('已提交争议，管理员将介入处理')
    }
  } catch (err) {
    toastStore.error(err.response?.data?.error || '操作失败')
  } finally {
    confirming.value = false
  }
}

async function handleCancel() {
  if (cancelling.value) return
  if (!confirm('确定要取消吗？')) return
  cancelling.value = true
  try {
    await matchStore.cancelMatch(match.value.id)
    matchStore.clearMatch()
    toastStore.info('已取消')
    router.push('/')
  } catch (err) {
    toastStore.error(err.response?.data?.error || '取消失败')
    await matchStore.fetchCurrentMatch()
  } finally {
    cancelling.value = false
  }
}

let socketListeners = []
let refreshInterval = null

function setupSocketListeners() {
  const socket = getSocket()
  if (!socket) return

  const onStart = (data) => {
    matchStore.fetchCurrentMatch()
    toastStore.info('比赛已开始')
  }

  const onAwaitingConfirm = (data) => {
    matchStore.fetchCurrentMatch()
    toastStore.info('对手已上报比分，请确认')
  }

  const onResult = (data) => {
    authStore.fetchProfile()
    matchStore.clearMatch()
    if (data.won) {
      toastStore.success(`对局胜利！积分 ${data.scoreChange >= 0 ? '+' : ''}${data.scoreChange}`)
    } else {
      toastStore.error(`对局失败，积分 ${data.scoreChange >= 0 ? '+' : ''}${data.scoreChange}`)
    }
    setTimeout(() => router.push('/'), 1500)
  }

  const onDisputed = (data) => {
    matchStore.fetchCurrentMatch()
    toastStore.warning('对局已标记为争议')
  }

  const onCancelled = (data) => {
    matchStore.clearMatch()
    toastStore.info(`对局已取消：${data.reason || ''}`)
    setTimeout(() => router.push('/'), 1000)
  }

  socket.on('match:start', onStart)
  socket.on('match:awaiting_confirm', onAwaitingConfirm)
  socket.on('match:result', onResult)
  socket.on('match:disputed', onDisputed)
  socket.on('match:cancelled', onCancelled)

  socketListeners = [
    { event: 'match:start', handler: onStart },
    { event: 'match:awaiting_confirm', handler: onAwaitingConfirm },
    { event: 'match:result', handler: onResult },
    { event: 'match:disputed', handler: onDisputed },
    { event: 'match:cancelled', handler: onCancelled },
  ]
}

function cleanupSocketListeners() {
  const socket = getSocket()
  if (!socket) return
  socketListeners.forEach(({ event, handler }) => {
    socket.off(event, handler)
  })
  socketListeners = []
}

onMounted(async () => {
  await matchStore.fetchCurrentMatch()
  setupSocketListeners()
  initHeroForm()
  // 加载英雄列表（用于 BP 上报选择）
  loadHeroes()

  // 后台预热 OCR 引擎（下载 wasm/语言包），点击识别时不再等待
  getOcrWorker().catch(() => {})

  // 定时刷新
  refreshInterval = setInterval(() => {
    matchStore.fetchCurrentMatch()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
  cleanupSocketListeners()
})
</script>
