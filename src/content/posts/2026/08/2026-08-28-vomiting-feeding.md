---
schemaVersion: 1
recordId: trauma-2026-08-28-vomiting-feeding
board: trauma
entryType: clinical-update
title: "8월 25~28일 구토와 영양 재개"
summary: "반복 구토 뒤 금식과 소량 영양 재개, 발열·항생제와 활력징후를 날짜별로 정리했습니다."
status: needs-original-check
sensitivity: highly-sensitive
eventAt:
  start: "2026-08-25"
  end: "2026-08-28"
  precision: range
  timezone: Asia/Seoul
recordedAt: { start: "2026-08-28", precision: day, timezone: Asia/Seoul }
tags: [구토, 금식, 경장영양, 발열, 항생제]
sources:
  - id: source-trauma-20260828-visible-update
    type: chat-conversation
    certainty: confirmed
    label: "8월 28일 상태 업데이트에서 확인 가능한 날짜별 항목"
  - id: source-trauma-20260828-nurse
    type: nurse-report
    certainty: reported
    label: "보호자가 전달받아 기록한 간호 경과와 활력징후"
  - id: source-trauma-20260828-gpt-summary
    type: gpt-analysis
    certainty: inferred
    label: "당시 GPT 답변 검색 요약"
exchanges:
  - id: exchange-trauma-20260828-001
    recordedAt: { start: "2026-08-28", precision: day, timezone: Asia/Seoul }
    user:
      original: |-
        [확인 가능한 날짜별 항목의 요약 복원]

        - 8월 25일: 구토 6회 뒤 금식.
        - 8월 26일: 구토는 없었으나 금식 유지.
        - 8월 27일 오전 10시경: 위관영양 100cc 재개.
        - 8월 27일 오후 4시경: 체온 38.2℃. 오후 6시경 해열제 투여.
        - 8월 27일 밤: 항생제 투여 시작.
        - 8월 27일 밤부터 28일 새벽: 소변 1,100cc.
        - 8월 28일 오전 6시경: 혈압 106/72, 맥박 85, 산소포화도 99%, 체온 36.8℃.
        - 8월 28일 오전 11시 30분: 체온 36.8℃.
      fidelity: summary-reconstruction
    assistant:
      text: |-
        [당시 답변 원문 확인 전 요약]

        당시 답변은 구토 뒤 콧줄 영양을 중단하고 복부 X-ray를 확인한 다음 재개 여부를 결정하는 흐름, 발열과 항생제 투여 시작, 간수치 상승과 약물 조정 관찰을 중심으로 상태를 정리했다.
      modelLabel: ChatGPT
      fidelity: summary-reconstruction
    sourceRefs:
      - source-trauma-20260828-visible-update
      - source-trauma-20260828-nurse
      - source-trauma-20260828-gpt-summary
amendments: []
media: []
related: [trauma-2026-08-26-dai-and-respiratory]
privacyReviewed: true
---
