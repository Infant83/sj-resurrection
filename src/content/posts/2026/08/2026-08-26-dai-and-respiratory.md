---
schemaVersion: 1
recordId: trauma-2026-08-26-dai-and-respiratory
board: trauma
entryType: clinical-update
title: "MRI의 미만성 축삭손상 설명과 호흡·의식 경과"
summary: "주치의 면담에서 들은 MRI·의식 평가와 보호자가 관찰한 호흡·반응을 분리해 기록했습니다."
status: needs-original-check
sensitivity: highly-sensitive
eventAt: { start: "2026-08-26", precision: day, timezone: Asia/Seoul }
recordedAt: { start: "2026-08-26", precision: day, timezone: Asia/Seoul }
tags: [미만성축삭손상, MRI, 의식반응, 기관절개, 산소보조]
sources:
  - id: source-trauma-20260826-physician
    type: physician-report
    certainty: reported
    label: "보호자가 기록한 주치의 면담 설명"
  - id: source-trauma-20260826-caregiver
    type: caregiver-observation
    certainty: observed
    label: "보호자가 직접 관찰한 호흡과 반응"
  - id: source-trauma-20260826-visible-prompt
    type: chat-conversation
    certainty: confirmed
    label: "현재 확인 가능한 DAI 관련 사용자 문장"
exchanges:
  - id: exchange-trauma-20260826-001
    recordedAt: { start: "2026-08-26", precision: day, timezone: Asia/Seoul }
    user:
      original: |-
        [면담·관찰 기록의 요약 복원]

        MRI에서 여러 곳에 점처럼 보이는 병변이 있고 미만성 축삭손상이라고 설명받았다. 수술할 병변은 없으며 GCS는 약 8/15로 들었다. 눈맞춤은 전보다 좋아졌지만 질문이나 손 들기 같은 명령에 일관되게 반응하지는 않았다. 손상의 등급과 뇌량·뇌간 침범 여부는 면담에서 확인하지 못했다.

        기관절개 상태에서 호흡은 안정적이었다. 처음 정리와 달리 인공호흡기를 사용한 것이 아니라 산소만 보조받고 있었다. 선진은 맑고 묽은 가래를 스스로 기관절개관 쪽으로 올렸고, 불편할 때 심박수가 오르거나 큰 호흡으로 가래를 내보내려는 모습이 보였다.

        보호자는 가족을 알아보는 듯 오래 바라보거나 울고, 엄마가 있는 방향으로 고개를 돌리는 모습을 관찰했다. 이 관찰은 의료진의 명령 수행 평가와 구분해 기록한다.
      fidelity: summary-reconstruction
    sourceRefs: [source-trauma-20260826-physician, source-trauma-20260826-caregiver]
  - id: exchange-trauma-20260826-002
    recordedAt: { start: "2026-08-26", precision: day, timezone: Asia/Seoul }
    user:
      original: |-
        미만성 축삭손상이 있다고 이야기했어.
      fidelity: exact
    sourceRefs: [source-trauma-20260826-visible-prompt, source-trauma-20260826-physician]
  - id: exchange-trauma-20260826-003
    recordedAt: { start: "2026-08-27", precision: day, timezone: Asia/Seoul }
    user:
      original: |-
        선진이의 경우 폐렴이나 가래문제 흉수 등의 문제와 함께 혈액수치나 간수치 등의 문제가 업다운이 있지만 급격히 호전되는 느낌은 아니야. 사고후 한달이상되었는데 안정화되는데 시간이 좀 걸리는 느낌인데 왜 그럴까…
      fidelity: exact
    sourceRefs: [source-trauma-20260826-visible-prompt]
amendments:
  - id: amendment-trauma-20260826-001
    recordedAt: { start: "2026-08-26", precision: day, timezone: Asia/Seoul }
    kind: correction
    target: exchange-trauma-20260826-001
    note: "면담 직후 첫 정리에는 인공호흡기 사용으로 적혔으나, 보호자의 현장 확인에 따라 ‘기관절개 상태에서 산소 보조’로 정정했습니다."
    sourceRefs: [source-trauma-20260826-caregiver]
  - id: amendment-trauma-20260826-002
    recordedAt: { start: "2026-08-26", precision: day, timezone: Asia/Seoul }
    kind: clarification
    target: exchange-trauma-20260826-001
    note: "MRI에서 미만성 축삭손상이라는 설명을 들은 사실은 확인되지만, 손상 등급과 뇌량·뇌간 침범 여부는 현재 기록만으로 확정할 수 없습니다."
    sourceRefs: [source-trauma-20260826-physician]
media: []
related: [trauma-2026-08-25-fever-interview-prep]
privacyReviewed: true
---
