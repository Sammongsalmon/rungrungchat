#!/usr/bin/env python3
"""
룽룽씨 메이커 빌드 스크립트

src/ 의 조각들을 순서대로 이어 붙여 루트의 index.html 한 파일을 만든다.
배포되는 건 index.html 하나뿐이고, src/ 는 편집용 원본이다.

    python3 build.py
"""
import os, sys

ORDER = [
    '00_head.html',      # <head>, 디자인 토큰
    '01_layout.css',     # 앱 셸 · 미리보기 무대
    '02_panel.css',      # 패널 · 폼 컨트롤
    '03_controls.css',   # 슬라이더 · 컬러 · 테마칩 · 편집 리스트
    '04_preview.css',    # 폰 화면 (채팅 / 메모)
    '05_responsive.css', # 반응형
    '06_body.html',      # 마크업
    '10_util.js',        # 유틸 · 아이콘 · 색 · 샌디타이저
    '11_parse.js',       # 채팅/메모 파서
    '12_theme.js',       # 테마 엔진 + 기본 테마
    '13_state.js',       # 상태 · 자동저장
    '14_render.js',      # 프리뷰 렌더러
    '15_controls.js',    # 슬라이더/입력창/토스트
    '16_export.js',      # 분할 + PNG 내보내기
    '17_app.js',         # 덱 구성 · 레이아웃 · 파싱 파이프라인
    '18_edit.js',        # 범위 · 편집 리스트
    '19_themeui.js',     # 테마 UI
    '20_init.js',        # 샘플 · 배선 · 부팅
]

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    src = os.path.join(here, 'src')
    missing = [f for f in ORDER if not os.path.exists(os.path.join(src, f))]
    if missing:
        sys.exit('src/ 에서 다음 파일을 찾지 못했습니다: ' + ', '.join(missing))

    out = ''.join(open(os.path.join(src, f), encoding='utf-8').read() for f in ORDER)

    bad = sorted({c for c in out if ord(c) < 9 or ord(c) in (11, 12) or 14 <= ord(c) <= 31})
    if bad:
        sys.exit('제어 문자가 섞여 있습니다: %r' % bad)

    dst = os.path.join(here, 'index.html')
    open(dst, 'w', encoding='utf-8').write(out)
    print('index.html 생성 완료 — %.1f KB' % (len(out.encode('utf-8')) / 1024))

if __name__ == '__main__':
    main()
