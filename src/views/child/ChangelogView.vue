<script setup>
const changelog = [
  {
    date: '2026-03-15',
    changes: [
      'コメントにもタグを付与できるように変更',
      'ダッシュボードに吹き出しボタン（管理者コメントのみ表示）を追加',
      '複数写真アップロード時に全写真へタグを付与するよう修正',
      'Androidで写真の複数選択ができない問題を回避',
      '管理画面のUIを一部改善',
      '更新履歴画面を追加',
    ],
  },
  { date: '2026-03-14', changes: ['写真を貼る機能で複数枚同時選択・投稿に対応'] },
  {
    date: '2026-03-13',
    changes: [
      'ヘッダーに画面名を表示',
      'ダッシュボードにタグ絞り込み機能を追加',
      'タグ検索をAND検索に統一',
      'ダッシュボード・タイムラインを新しい順にソート',
      'GPSタグフォームのラベルを北緯・東経に改善',
      'ダッシュボード・タイムラインに背景色を追加',
    ],
  },
  {
    date: '2026-03-06',
    changes: [
      'メッセージ表示・フィルター・レイアウトの改善',
      '本日メッセージ取得の日付フィルタリングを修正',
      'コメント背景色の視認性改善',
      'メッセージのリアルタイム受信を追加',
    ],
  },
  {
    date: '2026-03-05',
    changes: [
      '親アプリ(/manage/)と子アプリ(/device/)を分離',
      'タグシステムの再設計（共通タグ・手動タグ・GPSタグ）',
    ],
  },
  {
    date: '2026-02-27',
    changes: [
      'photonisshi 初期リリース',
    ],
  },
]

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${y}/${m}/${day}(${dow})`
}
</script>

<template>
  <v-container class="pa-4" style="max-width: 600px">
    <h2 class="text-h6 mb-4">更新履歴</h2>

    <v-timeline side="end" density="compact">
      <v-timeline-item
        v-for="entry in changelog"
        :key="entry.date"
        dot-color="primary"
        size="small"
      >
        <div class="text-body-2 font-weight-bold mb-1">{{ formatDate(entry.date) }}</div>
        <ul class="text-body-2 pl-4">
          <li v-for="(change, i) in entry.changes" :key="i">{{ change }}</li>
        </ul>
      </v-timeline-item>
    </v-timeline>
  </v-container>
</template>
