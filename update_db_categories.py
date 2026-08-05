import json
from pathlib import Path

DB = Path('/home/user/spa_operational_pwa/data/db.json')

def cat(name, subcategories, source_url=None, group=None, source='main_menu_extracted'):
    return {
        'name': name,
        'group': group or name,
        'subcategories': subcategories,
        'source': source,
        'source_url': source_url or ''
    }

category_master = [
    cat('스킨케어', ['스킨/토너', '에센스/세럼/앰플', '크림', '로션', '미스트/오일', '스킨케어세트', '스킨케어 디바이스'], 'https://www.oliveyoung.co.kr/store/display/getCategoryShop.do?dispCatNo=10000010001'),
    cat('마스크팩', ['시트팩', '패드', '페이셜팩', '코팩', '패치'], '', '스킨케어'),
    cat('클렌징', ['클렌징폼/젤', '오일/밤', '워터/밀크', '필링&스크럽', '티슈/패드', '립&아이리무버', '클렌징 디바이스'], '', '스킨케어'),
    cat('선케어', ['선크림', '선스틱', '선쿠션', '선스프레이/선패치', '태닝/애프터선'], 'https://www.oliveyoung.co.kr/store/display/getCategoryShop.do?dispCatNo=10000010011'),
    cat('메이크업', ['립메이크업', '베이스메이크업', '아이메이크업'], 'https://www.oliveyoung.co.kr/store/display/getMCategoryList.do?dispCatNo=10000010002'),
    cat('뷰티소품', ['메이크업 툴', '아이래쉬 툴', '페이스 툴', '헤어/바디 툴', '데일리 툴']),
    cat('더모 코스메틱', ['스킨케어', '바디케어', '클렌징', '선케어', '마스크팩']),
    cat('네일', ['일반네일', '젤네일', '네일팁/스티커', '네일케어/리무버']),
    cat('헤어케어', ['샴푸/스케일러', '트리트먼트/팩', '두피에센스', '헤어에센스', '염모제/펌', '헤어기기/브러시', '스타일링']),
    cat('바디케어', ['샤워/입욕', '바디로션/크림', '오일/미스트', '제모/왁싱', '데오드란트', '핸드케어', '풋케어', '유아동/임산부'], 'https://www.oliveyoung.co.kr/store/display/getCategoryShop.do?dispCatNo=10000010003'),
    cat('향수/디퓨저', ['향수', '미니/고체향수', '홈프래그런스']),
    cat('건강식품', ['비타민', '영양제', '유산균', '슬리밍/이너뷰티']),
    cat('푸드', ['식단관리/이너뷰티', '과자/초콜릿/디저트', '생수/음료/커피', '간편식/요리', '베이비푸드']),
    cat('헬스/건강용품', ['패치/국소케어', '릴랙스 용품', '생활/의료', '마사지/보호대', '운동용품']),
    cat('구강용품', ['칫솔', '치약', '애프터구강케어', '휴대용세트', '구강가전']),
    cat('위생용품', ['생리/위생용품', 'Y존케어', '성인용품', '마사지젤/오일', '테스트기', '기저귀', '화장지']),
    cat('패션', ['언더웨어', '패션잡화', '스포츠웨어', '홈웨어']),
    cat('홈리빙/가전', ['가전', '키친', '인테리어', '욕실', '세제/청소', '반려동물', '출산/유아동']),
    cat('취미/팬시', ['캐릭터/굿즈', '팬시/문구', '디지털/기기', '음반'])
]

site_sections = [
    {'name': '오특', 'url': 'https://www.oliveyoung.co.kr/store/main/getHotdealList.do'},
    {'name': '랭킹', 'url': 'https://www.oliveyoung.co.kr/store/main/getBestList.do'},
    {'name': '올리브베러', 'url': 'https://www.oliveyoung.co.kr/store/planshop/getPlanShopDetail.do?dispCatNo=500000100015351'},
    {'name': '테마관', 'url': 'https://www.oliveyoung.co.kr/store/planshop/getPlanShopDetail.do?dispCatNo=500000102780092&type=theme'},
    {'name': '기획전', 'url': 'https://www.oliveyoung.co.kr/store/main/getPlanShopList.do'},
    {'name': '세일', 'url': 'https://www.oliveyoung.co.kr/store/main/getSaleList.do'},
    {'name': '기프트카드', 'url': 'https://www.oliveyoung.co.kr/store/giftCardGuide/getGiftCardGuide.do'},
    {'name': '멤버십/쿠폰', 'url': 'https://www.oliveyoung.co.kr/store/main/getMembership.do'},
    {'name': '이벤트', 'url': 'https://www.oliveyoung.co.kr/store/main/getEventList.do'},
    {'name': 'FESTA', 'url': ''},
    {'name': 'AWARDS', 'url': ''}
]

featured_products = {
    '스킨케어': [
        '웰라쥬 리얼 히알루로닉 블루 100 앰플 100ml 기획 (+60ml 리필+수딩크림 30ml)',
        '[1등미백앰플]메디큐브 PDRN 핑크 펩타이드 앰플 30ml 리필기획(+리필팩50ml+거울키링)',
        '[대용량리필] 메디큐브 제로 모공 원데이 펩타이드 세럼 30ml 리필기획 (+리필팩 50ml)',
        '[흔적,기미,미백/TXA] 셀리맥스 트라넥삼산 잡티 크림 35ml 기획 (+14ml)',
        '에스트라 아토베리어365 하이드로 수딩크림 80ml 기획 (+수딩크림 10ml+클렌징폼 30g)',
        '[8월올영픽/3일진정세럼]브링그린 징크테카 트러블 세럼 대용량 기획',
        '[조유리 PICK/트러블1등] 셀라딕스 트러블 세범 리밸런싱 131 앰플 30ml',
        '[1+1/1등 모공 수분천재크림] 에스네이처 아쿠아 스쿠알란 수분크림 60ml 더블기획',
        '[흔적 리페어_c-PDRN 10,000 PPM]리쥬덱스 더마 리페어링 솔루션 앰플 10mLx2EA',
        '[단독기획/모공탄력] 셀리맥스 더 비타 A 레티날 샷 타이트닝 부스터 15ml 기획(+3ml)'
    ]
}

scan_meta = {
    'source_site': 'https://www.oliveyoung.co.kr/store/main/main.do?oy=0&_CAD=nbsa00&utm_source=naver&utm_medium=brand_search&utm_campaign=onpro_emnet_main_26_0101_1231&utm_content=pc_home',
    'scan_scope': 'all_top_level_categories_and_visible_subcategories',
    'scan_method': 'main_menu_extracted_plus_accessible_category_pages',
    'scan_date_utc': '2026-08-05',
    'category_count': len(category_master),
    'note': '올리브영 메인 메뉴에서 전 카테고리 계층을 추출해 DB 카테고리 마스터를 업데이트함. 전체 개별 상품 풀크롤은 사이트 차단/페이징 규모로 인해 별도 장기 수집 파이프라인이 필요함.'
}

with DB.open('r', encoding='utf-8') as f:
    data = json.load(f)

data['categories'] = category_master
data['site_sections'] = site_sections
data['featured_products_by_category'] = featured_products
data['scan_meta'] = scan_meta

with DB.open('w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
