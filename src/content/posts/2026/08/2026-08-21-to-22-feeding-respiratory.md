---
schemaVersion: 1
recordId: trauma-2026-08-21-to-22-feeding-respiratory
board: trauma
entryType: clinical-update
title: "구토 뒤 영양 재개와 호흡·간수치 관리"
summary: "8월 21~22일의 구토, 경장영양 재개, 가래·흉수와 간수치 변화를 묶어 기록했습니다."
status: needs-original-check
sensitivity: highly-sensitive
eventAt:
  start: "2026-08-21"
  end: "2026-08-22"
  precision: range
  timezone: Asia/Seoul
recordedAt:
  start: "2026-08-22"
  precision: day
  timezone: Asia/Seoul
tags: [구토, 경장영양, 가래, 흉수, 간수치]
sources:
  - id: source-trauma-20260821-22-chat-summary
    type: chat-conversation
    certainty: reported
    label: "8월 21~22일 대화 검색 요약(원문 전문 미확보)"
  - id: source-trauma-20260821-22-nurse
    type: nurse-report
    certainty: reported
    label: "보호자가 전달받아 기록한 간호 경과"
exchanges:
  - id: exchange-trauma-20260821-22-001
    recordedAt: { start: "2026-08-22", precision: day, timezone: Asia/Seoul }
    user:
      original: |-
        [원문 전문 확인 전 요약 복원]

        8월 21일 밤 구토가 있어 콧줄을 통한 영양 공급을 중단했다. 진정제를 줄인 뒤 기침이 늘었고 가래가 많았다. 왼쪽 폐의 흉수와 배액 계획이 언급되었으며, 가래검사에서는 균이 계속 확인되어 격리 해제 조건인 3회 연속 음성을 기다리고 있었다.

        8월 22일에는 미음 또는 경장영양을 다시 시작해 천천히 늘리기로 했다. 흡인성 폐렴 위험 때문에 급격히 증량하지 않았고, 경미한 장폐색 가능성을 매일 X-ray로 확인했다. 진정제는 더 줄이지 않았으며, 간수치 상승 때문에 일부 약을 중단·조정하고 치료를 시작했다.
      fidelity: summary-reconstruction
    sourceRefs: [source-trauma-20260821-22-chat-summary, source-trauma-20260821-22-nurse]
amendments:
  - id: amendment-trauma-20260821-22-001
    recordedAt: { start: "2026-08-22", precision: day, timezone: Asia/Seoul }
    kind: clarification
    target: exchange-trauma-20260821-22-001
    note: "‘콧줄 영양을 중단했다’는 사실만 확인됩니다. 콧줄 자체를 제거했는지 여부는 원문에서 확인되지 않아 기록하지 않았습니다. 격리 해제 검사 1회 음성은 8월 20~22일 무렵의 사실로, 정확한 날짜 확인이 필요합니다."
    sourceRefs: [source-trauma-20260821-22-chat-summary]
media: []
related: [trauma-2026-08-20-family-response]
privacyReviewed: true
---
