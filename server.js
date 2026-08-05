const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

const adapter = new JSONFile(DB_FILE);
const db = new Low(adapter, {});

const recommendationRules = {
  hydration: [['글리세린', 8], ['판테놀', 12], ['세라마이드', 14], ['히알루론산', 12], ['스쿠알란', 10], ['베타인', 7]],
  soothing: [['병풀', 12], ['센텔라', 12], ['마데카소사이드', 14], ['알란토인', 8], ['판테놀', 10], ['어성초', 10], ['징크', 10]],
  sebum: [['징크', 14], ['살리실산', 13], ['나이아신아마이드', 10], ['티트리', 7], ['어성초', 8], ['클레이', 7]],
  tone: [['나이아신아마이드', 12], ['비타민C', 12], ['아스코빅', 12], ['트라넥사믹', 14], ['알부틴', 12]],
  antiaging: [['레티놀', 16], ['레티날', 16], ['펩타이드', 12], ['아데노신', 10], ['PDRN', 12]]
};

const skinBonus = {
  dry: [['세라마이드', 10], ['히알루론산', 10], ['판테놀', 10], ['스쿠알란', 10]],
  oily: [['징크', 10], ['살리실산', 10], ['나이아신아마이드', 9]],
  combination: [['나이아신아마이드', 8], ['판테놀', 8], ['히알루론산', 8]],
  sensitive: [['병풀', 10], ['마데카소사이드', 12], ['판테놀', 10], ['알란토인', 8]],
  acne: [['살리실산', 12], ['징크', 12], ['나이아신아마이드', 9], ['어성초', 8]]
};

const cautionMap = {
  '향료': ['향료', '리모넨', '리날룰', '시트랄'],
  '에센셜오일': ['라벤더오일', '오렌지껍질오일', '티트리잎오일'],
  '변성알코올': ['변성알코올', '에탄올'],
  'AHA/BHA': ['글리콜릭애씨드', '락틱애씨드', '살리실산', 'AHA', 'BHA'],
  '레티노이드': ['레티놀', '레티날', '레티닐']
};

const CORE_EXPANSION_TARGETS = {
  '스킨케어': 1000,
  '메이크업': 800,
  '헤어케어': 700,
  '바디케어': 700,
  '선케어': 500,
  '건강식품': 700,
  '푸드': 500,
  '헬스/건강용품': 500,
  '마스크팩': 600,
  '클렌징': 600,
  '더모 코스메틱': 500
};

const DETAIL_PAGE_BASE = 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=';
const CATEGORY_ALIASES = {
  '스킨케어': ['스킨케어', '앰플', '세럼', '에센스', '토너', '스킨', '크림', '로션', '미스트', '오일', '패드', '토너패드', '마스크팩', '클렌징', '더모 코스메틱'],
  '메이크업': ['메이크업', '립메이크업', '베이스메이크업', '아이메이크업', '쿠션', '틴트', '립', '파운데이션', '컨실러', '블러셔', '밤 스틱'],
  '선케어': ['선케어', '선크림', '선스틱', '선쿠션', '선스프레이', '선패치', '태닝', '애프터선'],
  '헤어케어': ['헤어케어', '샴푸', '트리트먼트', '헤어팩', '헤어오일', '두피'],
  '바디케어': ['바디케어', '바디워시', '바디로션', '바디스크럽', '핸드크림'],
  '건강식품': ['건강식품'],
  '푸드': ['푸드'],
  '헬스/건강용품': ['헬스/건강용품', '구강용품', '건강용품', '패치'],
  '기타': ['기타', 'W케어', '맨즈케어', '뷰티소품', '네일', '향수/디퓨저']
};

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .split(/[\n,\/;]+/)
    .map(v => v.trim())
    .filter(Boolean);
}

function hasToken(tokens, key) {
  return tokens.some(t => t.includes(String(key).toLowerCase()));
}

function normalizeIngredients(raw = '') {
  return tokenize(raw).join(', ');
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function extractGoodsNo(url = '') {
  const match = String(url || '').match(/goodsNo=([A-Z0-9]+)/i);
  return match ? match[1] : '';
}

function normalizeDetailPageUrl(url = '') {
  const goodsNo = extractGoodsNo(url);
  return goodsNo ? `${DETAIL_PAGE_BASE}${goodsNo}` : '';
}

function hasOliveImage(url = '') {
  return /image\.oliveyoung\.co\.kr|cfimages/i.test(String(url || ''));
}


function normalizeImageUrl(url = '') {
  return String(url || '').trim();
}

function inferImageStatus(url = '') {
  return normalizeImageUrl(url) ? (hasOliveImage(url) ? 'verified' : 'manual_input') : 'pending_image';
}

function isVerifiedDetailPageUrl(url = '') {
  return Boolean(normalizeDetailPageUrl(url));
}

function aliasBucket(category = '') {
  const normalized = String(category || '').trim();
  if (!normalized) return '';
  for (const [bucket, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))) return bucket;
  }
  return normalized;
}

function matchesRequestedCategory(product = {}, requested = 'all') {
  if (!requested || requested === 'all') return true;
  const requestedValue = String(requested).trim();
  const candidates = unique([product.category, product.subcategory, aliasBucket(product.category), aliasBucket(product.subcategory)]);
  const aliasList = CATEGORY_ALIASES[requestedValue] || [requestedValue];
  return candidates.some(candidate => aliasList.some(alias => String(candidate || '').includes(alias) || alias.includes(String(candidate || ''))));
}

function buildRecentExposureMap(consultations = []) {
  const recent = (consultations || []).slice(-20);
  return recent.reduce((acc, consult, consultIndex) => {
    (consult.recommendations || []).forEach((item, itemIndex) => {
      if (!item || !item.name) return;
      const weight = Math.max(1, 5 - itemIndex) + Math.max(0, recent.length - consultIndex > 10 ? 0 : 1);
      acc[item.name] = (acc[item.name] || 0) + weight;
    });
    return acc;
  }, {});
}

function diversifyRecommendations(ranked = [], limit = 5) {
  // v2: 카테고리 로테이션 + 브랜드 중복 제한
  // 1차) 상위를 카테고리를 거치며 거르기 (같은 카테고리 최대 2개까지 허용)
  const picks = [];
  const usedBrands = new Set();
  const usedNames = new Set();
  const perCategoryCount = {};

  for (const item of ranked) {
    if (picks.length >= limit) break;
    const brandKey = String(item.brand || '').trim().toLowerCase();
    const nameKey = String(item.name || '').trim().toLowerCase();
    const catKey = String(item.category || '').trim().toLowerCase();
    if (usedNames.has(nameKey)) continue;
    if (brandKey && usedBrands.has(brandKey)) continue;
    if (catKey && (perCategoryCount[catKey] || 0) >= 2) continue;
    picks.push(item);
    if (brandKey) usedBrands.add(brandKey);
    usedNames.add(nameKey);
    if (catKey) perCategoryCount[catKey] = (perCategoryCount[catKey] || 0) + 1;
  }

  // 2차) 모자람 상품이 모자라면 브랜드 제한만 풀고 채움
  for (const item of ranked) {
    if (picks.length >= limit) break;
    const nameKey = String(item.name || '').trim().toLowerCase();
    if (usedNames.has(nameKey)) continue;
    picks.push(item);
    usedNames.add(nameKey);
  }

  return picks.slice(0, limit);
}

function productHasIngredients(product = {}) {
  return Boolean(String(product.ingredientsRaw || product.ingredientsNormalized || '').trim());
}

function ensureProductDefaults(product = {}) {
  if (!product.category) product.category = '기타';
  if (!Object.prototype.hasOwnProperty.call(product, 'subcategory')) product.subcategory = '';
  if (!Object.prototype.hasOwnProperty.call(product, 'inventory')) product.inventory = 0;
  if (!Object.prototype.hasOwnProperty.call(product, 'price')) product.price = 0;
  if (!Object.prototype.hasOwnProperty.call(product, 'ingredientsRaw')) product.ingredientsRaw = '';
  if (!Object.prototype.hasOwnProperty.call(product, 'ingredientsNormalized')) {
    product.ingredientsNormalized = normalizeIngredients(product.ingredientsRaw || '');
  }
  if (!Object.prototype.hasOwnProperty.call(product, 'ingredientStatus')) {
    product.ingredientStatus = productHasIngredients(product) ? 'completed' : 'pending_full_ingredients';
  }
  if (!Object.prototype.hasOwnProperty.call(product, 'priceStatus')) {
    product.priceStatus = Number(product.price || 0) > 0 ? 'confirmed_listing' : 'price_needs_verification';
  }
  const normalizedDetail = normalizeDetailPageUrl(product.detailPageUrl || product.sourceUrl || '');
  product.detailPageUrl = normalizedDetail || '';
  product.verifiedDetailPage = Boolean(normalizedDetail);
  product.detailPageStatus = product.verifiedDetailPage ? 'verified' : 'pending_verification';
  product.imageUrl = normalizeImageUrl(product.imageUrl || '');
  product.imageAlt = String(product.imageAlt || product.name || '').trim();
  product.verifiedImage = Boolean(product.imageUrl);
  product.imageStatus = inferImageStatus(product.imageUrl);
  product.categoryBucket = aliasBucket(product.category);
  product.subcategoryBucket = aliasBucket(product.subcategory);
  return product;
}

function categoryProductCount(categoryName, products = []) {
  return products.filter(p => p.category === categoryName).length;
}

function seedIngredientQueue(products = []) {
  return products
    .filter(p => p.ingredientStatus === 'pending_full_ingredients')
    .map(p => ({
      productId: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      sourceUrl: p.sourceUrl || p.source_url || '',
      status: 'pending',
      priority: (['스킨케어', '선케어', '더모 코스메틱'].includes(p.category) ? 'high' : 'normal'),
      lastCheckedAt: '',
      note: '전성분 미확보 상품'
    }));
}

function buildExpansionPlan(categories = [], products = [], previous = []) {
  const previousMap = new Map((previous || []).map(item => [item.categoryName, item]));
  return categories.map(cat => {
    const currentCount = categoryProductCount(cat.name, products);
    const targetCount = CORE_EXPANSION_TARGETS[cat.name] || 500;
    const gapCount = Math.max(0, targetCount - currentCount);
    const prev = previousMap.get(cat.name) || {};
    return {
      id: prev.id || crypto.createHash('sha1').update(`plan:${cat.name}`).digest('hex').slice(0, 16),
      categoryName: cat.name,
      group: cat.group || '',
      sourceUrl: cat.source_url || cat.sourceUrl || '',
      targetCount,
      currentCount,
      gapCount,
      pageSizeAssumption: 40,
      estimatedPages: Math.ceil(gapCount / 40) || 0,
      status: gapCount > 0 ? (prev.status || 'planned') : 'satisfied',
      note: gapCount > 0 ? `${targetCount}건 목표 대비 ${gapCount}건 추가 필요` : '목표 달성',
      updatedAt: new Date().toISOString()
    };
  });
}

function buildPipelineStats(data) {
  const products = (data.products || []).map(ensureProductDefaults);
  const pendingProducts = products.filter(p => p.ingredientStatus === 'pending_full_ingredients');
  const completedProducts = products.filter(p => p.ingredientStatus === 'completed');
  const expansionPlans = data.pipeline?.categoryExpansionPlans || [];
  return {
    totalProducts: products.length,
    pendingIngredientCount: pendingProducts.length,
    completedIngredientCount: completedProducts.length,
    pendingIngredientCategories: unique(pendingProducts.map(p => p.category)).length,
    categoriesTracked: (data.categories || []).length,
    expansionPlanCount: expansionPlans.length,
    expansionNeededCount: expansionPlans.filter(p => p.gapCount > 0).length,
    pipelineReadyRate: products.length ? Math.round((completedProducts.length / products.length) * 100) : 0,
    topPendingBrands: Object.entries(pendingProducts.reduce((acc, p) => {
      acc[p.brand] = (acc[p.brand] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6),
    topCategoryGaps: expansionPlans.slice().sort((a, b) => b.gapCount - a.gapCount).slice(0, 6)
  };
}

async function initDb() {
  await db.read();
  db.data ||= {};
  db.data.users ||= [];
  db.data.products ||= [];
  db.data.consultations ||= [];
  db.data.inventory ||= [];
  db.data.rules ||= [];
  db.data.categories ||= [];
  db.data.scan_meta ||= {};
  db.data.pipeline ||= {};

  if (!db.data.users.length) {
    db.data.users.push(
      {
        id: nanoid(),
        username: 'admin',
        passwordHash: bcrypt.hashSync('admin1234', 10),
        role: 'admin',
        name: '관리자',
        createdAt: new Date().toISOString()
      },
      {
        id: nanoid(),
        username: 'staff',
        passwordHash: bcrypt.hashSync('staff1234', 10),
        role: 'staff',
        name: '매장직원',
        createdAt: new Date().toISOString()
      }
    );
  }

  if (!db.data.products.length) {
    db.data.products.push(
      {
        id: nanoid(),
        name: '더마토리 히알샷 베리어 앰플 비5',
        brand: '더마토리',
        category: '앰플',
        price: 24500,
        inventory: 12,
        ingredientsRaw: '정제수, 글리세린, 부틸렌글라이콜, 판테놀, 세라마이드엔피, 소듐하이알루로네이트, 알란토인, 베타인',
        ingredientsNormalized: '정제수, 글리세린, 부틸렌글라이콜, 판테놀, 세라마이드엔피, 소듐하이알루로네이트, 알란토인, 베타인',
        ingredientStatus: 'completed',
        createdAt: new Date().toISOString(),
        sampleSource: 'oliveyoung'
      },
      {
        id: nanoid(),
        name: '브링그린 징크테카 트러블 세럼',
        brand: '브링그린',
        category: '세럼',
        price: 28800,
        inventory: 20,
        ingredientsRaw: '정제수, 부틸렌글라이콜, 나이아신아마이드, 징크피씨에이, 병풀추출물, 마데카소사이드, 어성초추출물, 판테놀',
        ingredientsNormalized: '정제수, 부틸렌글라이콜, 나이아신아마이드, 징크피씨에이, 병풀추출물, 마데카소사이드, 어성초추출물, 판테놀',
        ingredientStatus: 'completed',
        createdAt: new Date().toISOString(),
        sampleSource: 'oliveyoung'
      },
      {
        id: nanoid(),
        name: '웰라쥬 리얼 히알루로닉 블루 100 앰플',
        brand: '웰라쥬',
        category: '앰플',
        price: 29900,
        inventory: 8,
        ingredientsRaw: '정제수, 글리세린, 부틸렌글라이콜, 히알루론산, 소듐하이알루로네이트, 판테놀, 베타인',
        ingredientsNormalized: '정제수, 글리세린, 부틸렌글라이콜, 히알루론산, 소듐하이알루로네이트, 판테놀, 베타인',
        ingredientStatus: 'completed',
        createdAt: new Date().toISOString(),
        sampleSource: 'oliveyoung'
      },
      {
        id: nanoid(),
        name: '토리든 밸런스풀 포맨 시카 오일 컨트롤 선스틱',
        brand: '토리든',
        category: '선스틱',
        price: 17800,
        inventory: 15,
        ingredientsRaw: '정제수, 나이아신아마이드, 병풀추출물, 마데카소사이드, 징크피씨에이, 실리카, 향료',
        ingredientsNormalized: '정제수, 나이아신아마이드, 병풀추출물, 마데카소사이드, 징크피씨에이, 실리카, 향료',
        ingredientStatus: 'completed',
        createdAt: new Date().toISOString(),
        sampleSource: 'oliveyoung'
      }
    );
  }

  if (!db.data.rules.length) {
    db.data.rules = [
      { id: nanoid(), title: '건성 + 장벽', description: '세라마이드, 판테놀, 히알루론산, 스쿠알란 가산' },
      { id: nanoid(), title: '민감성 + 진정', description: '병풀, 마데카소사이드, 알란토인, 어성초 가산 / 향료 감점' },
      { id: nanoid(), title: '지성 + 트러블', description: '징크, 살리실산, 나이아신아마이드 가산' },
      { id: nanoid(), title: '회피 요소', description: '향료, 에센셜오일, 변성알코올, 레티노이드 충돌 시 감점' }
    ];
  }

  db.data.products = db.data.products.map(ensureProductDefaults);
  db.data.pipeline.ingredientEnrichmentQueue = seedIngredientQueue(db.data.products);
  db.data.pipeline.categoryExpansionPlans = buildExpansionPlan(db.data.categories || [], db.data.products, db.data.pipeline.categoryExpansionPlans || []);
  db.data.pipeline.lastInitializedAt = new Date().toISOString();

  await db.write();
}

function publicUser(user) {
  return { id: user.id, username: user.username, role: user.role, name: user.name };
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  next();
}

async function attachUser(req, _res, next) {
  if (req.session.userId) {
    await db.read();
    req.user = db.data.users.find(u => u.id === req.session.userId) || null;
  }
  next();
}

function scoreProduct(product, profile, exposureMap = {}) {
  const tokens = tokenize(product.ingredientsRaw || product.ingredientsNormalized);
  let score = 50;
  const positive = [];
  const warnings = [];
  const tags = [];
  const categoryMatched = matchesRequestedCategory(product, profile.category || 'all');

  // v2: 가중치 폭 확대 (같은 상품이 항상 상위에 오지 않도록)
  (recommendationRules[profile.goal] || []).forEach(([k, v]) => {
    if (hasToken(tokens, k)) {
      const vv = Math.round(v * 2.2);
      score += vv;
      positive.push(`${k} · 목표 적합 +${vv}`);
      tags.push(k);
    }
  });

  (skinBonus[profile.skinType] || []).forEach(([k, v]) => {
    if (hasToken(tokens, k)) {
      const vv = Math.round(v * 2.0);
      score += vv;
      positive.push(`${k} · 피부 적합 +${vv}`);
      tags.push(k);
    }
  });

  (profile.avoidances || []).forEach(a => {
    (cautionMap[a] || []).forEach(k => {
      if (hasToken(tokens, k)) {
        score -= 22;
        warnings.push(`${k} · 회피 요소 충돌 -22`);
      }
    });
  });

  if (((profile.concerns || []).includes('민감') || profile.skinType === 'sensitive') && hasToken(tokens, '향료')) {
    score -= 25;
    warnings.push('향료 · 민감 피부 주의 -25');
  }
  if (((profile.concerns || []).includes('트러블') || profile.skinType === 'acne') && hasToken(tokens, '코코넛오일')) {
    score -= 20;
    warnings.push('코코넛오일 · 면포 우려 -20');
  }
  if (hasToken(tokens, '세라마이드') && hasToken(tokens, '판테놀')) {
    score += 6;
    positive.push('세라마이드+판테놀 · 장벽 시너지 +6');
  }
  if (hasToken(tokens, '히알루론산') && hasToken(tokens, '글리세린')) {
    score += 5;
    positive.push('히알루론산+글리세린 · 보습 시너지 +5');
  }
  if (hasToken(tokens, '나이아신아마이드') && hasToken(tokens, '징크')) {
    score += 6;
    positive.push('나이아신아마이드+징크 · 피지/트러블 시너지 +6');
  }

  if (!productHasIngredients(product)) {
    score -= 22;
    warnings.push('전성분 미확보 · 추천 신뢰도 낮음');
  } else {
    score += 7;
    positive.push('전성분 확보 완료 · 추천 신뢰도 가산');
  }

  if (categoryMatched && profile.category && profile.category !== 'all') {
    score += 10;
    tags.push(`카테고리:${profile.category}`);
  }

  if (!product.verifiedDetailPage) {
    score -= 4;
    warnings.push('상세페이지 미검증');
  } else {
    positive.push('상세페이지 검증 완료');
  }

  if (!product.verifiedImage) {
    warnings.push('대표 이미지 미연결');
  } else {
    positive.push('실제 대표 이미지 연결');
  }

  if (profile.budget === 'low' && Number(product.price || 0) > 30000) score -= 10;
  if (profile.budget === 'mid' && (Number(product.price || 0) < 30000 || Number(product.price || 0) > 50000)) score -= 5;
  if (profile.budget === 'high' && Number(product.price || 0) < 50000) score -= 2;

  const exposurePenalty = Math.min(25, Number(exposureMap[product.name] || 0) * 4);
  if (exposurePenalty) {
    score -= exposurePenalty;
    warnings.push(`최근 상담 반복 노출 -${exposurePenalty}`);
  }

  // v2: 완전 동점을 깨고 자연스러운 다양성을 주기 위한 지터
  const jitter = (Math.random() * 6) - 3;
  score += jitter;

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    ...product,
    score,
    categoryMatched,
    exposurePenalty,
    positive: unique(positive).slice(0, 6),
    warnings: unique(warnings).slice(0, 5),
    tags: unique(tags).slice(0, 8)
  };
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'spa-skin-match-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(attachUser);
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  await db.read();
  const user = db.data.users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: '계정을 찾을 수 없습니다.' });
  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  await db.read();
  const user = db.data.users.find(u => u.id === req.session.userId);
  res.json({ user: publicUser(user) });
});

app.get('/api/products', requireAuth, async (_req, res) => {
  await db.read();
  res.json({ products: db.data.products.map(ensureProductDefaults) });
});

app.post('/api/products', requireAuth, async (req, res) => {
  const { name, brand, category, subcategory, price, inventory, ingredientsRaw, sourceUrl, detailPageUrl, imageUrl, imageAlt } = req.body;
  if (!name || !brand) {
    return res.status(400).json({ error: '상품명, 브랜드는 필수입니다.' });
  }
  await db.read();
  const product = ensureProductDefaults({
    id: nanoid(),
    name,
    brand,
    category: category || '기타',
    subcategory: subcategory || '',
    price: Number(price || 0),
    inventory: Number(inventory || 0),
    ingredientsRaw: ingredientsRaw || '',
    ingredientsNormalized: normalizeIngredients(ingredientsRaw || ''),
    createdAt: new Date().toISOString(),
    createdBy: req.session.userId,
    sourceUrl: sourceUrl || '',
    detailPageUrl: detailPageUrl || '',
    imageUrl: imageUrl || '',
    imageAlt: imageAlt || name
  });
  db.data.products.unshift(product);
  db.data.pipeline.ingredientEnrichmentQueue = seedIngredientQueue(db.data.products);
  db.data.pipeline.categoryExpansionPlans = buildExpansionPlan(db.data.categories || [], db.data.products, db.data.pipeline.categoryExpansionPlans || []);
  await db.write();
  res.json({ product });
});

app.post('/api/products/import', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '업로드 파일이 없습니다.' });
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    await db.read();
    let imported = 0;
    rows.forEach(row => {
      const name = row.product_name || row.name || row['상품명'];
      const brand = row.brand || row['브랜드'];
      const category = row.category || row['카테고리'] || '기타';
      const subcategory = row.subcategory || row['서브카테고리'] || '';
      const price = Number(row.price || row['가격'] || 0);
      const inventory = Number(row.inventory || row['재고'] || 0);
      const ingredientsRaw = row.ingredients || row.ingredients_raw || row['전성분'] || '';
      const sourceUrl = row.source_url || row['소스URL'] || row['sourceUrl'] || '';
      const detailPageUrl = row.detail_page_url || row['상세페이지URL'] || row['detailPageUrl'] || '';
      const imageUrl = row.image_url || row['이미지URL'] || row['imageUrl'] || '';
      const imageAlt = row.image_alt || row['이미지설명'] || row['imageAlt'] || name || '';
      if (!name || !brand) return;
      db.data.products.unshift(ensureProductDefaults({
        id: nanoid(),
        name,
        brand,
        category,
        subcategory,
        price,
        inventory,
        ingredientsRaw,
        ingredientsNormalized: normalizeIngredients(ingredientsRaw),
        createdAt: new Date().toISOString(),
        createdBy: req.session.userId,
        source: 'excel_import',
        sourceUrl,
        detailPageUrl,
        imageUrl,
        imageAlt
      }));
      imported += 1;
    });
    db.data.pipeline.ingredientEnrichmentQueue = seedIngredientQueue(db.data.products);
    db.data.pipeline.categoryExpansionPlans = buildExpansionPlan(db.data.categories || [], db.data.products, db.data.pipeline.categoryExpansionPlans || []);
    await db.write();
    fs.unlinkSync(req.file.path);
    res.json({ imported });
  } catch (error) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(500).json({ error: '엑셀/CSV 파싱에 실패했습니다.' });
  }
});

app.get('/api/products/template', requireAuth, (_req, res) => {
  const rows = [
    { product_name: '샘플 세럼', brand: '샘플브랜드', category: '스킨케어', subcategory: '세럼', price: 32000, inventory: 10, ingredients: '정제수, 글리세린, 판테놀, 세라마이드엔피', source_url: 'https://example.com/product', detail_page_url: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000000000', image_url: 'https://image.oliveyoung.co.kr/sample.jpg', image_alt: '샘플 세럼 대표 이미지' }
  ];
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'products');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="product_import_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

app.get('/api/products/media-template', requireAuth, async (_req, res) => {
  await db.read();
  const rows = db.data.products
    .map(ensureProductDefaults)
    .map(p => ({
      product_id: p.id,
      product_name: p.name,
      brand: p.brand,
      category: p.category,
      detail_page_url: p.detailPageUrl || '',
      image_url: p.imageUrl || '',
      image_alt: p.imageAlt || p.name || '',
      detail_page_status: p.detailPageStatus || '',
      image_status: p.imageStatus || ''
    }));
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows.length ? rows : [{ product_id: '', product_name: '', brand: '', category: '', detail_page_url: '', image_url: '', image_alt: '', detail_page_status: '', image_status: '' }]);
  xlsx.utils.book_append_sheet(wb, ws, 'product_media');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="product_media_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

app.post('/api/products/media-import', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '업로드 파일이 없습니다.' });
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    await db.read();
    const products = db.data.products.map(ensureProductDefaults);
    let updated = 0;
    rows.forEach(row => {
      const productId = String(row.product_id || row['상품ID'] || '').trim();
      const productName = String(row.product_name || row.name || row['상품명'] || '').trim();
      const target = products.find(p => (productId && p.id === productId) || (productName && p.name === productName));
      if (!target) return;
      const detailPageUrl = String(row.detail_page_url || row['상세페이지URL'] || row.detailPageUrl || '').trim();
      const imageUrl = String(row.image_url || row['이미지URL'] || row.imageUrl || '').trim();
      const imageAlt = String(row.image_alt || row['이미지설명'] || row.imageAlt || target.name || '').trim();
      if (detailPageUrl) {
        target.detailPageUrl = detailPageUrl;
        target.verifiedDetailPage = Boolean(normalizeDetailPageUrl(detailPageUrl));
        target.detailPageStatus = target.verifiedDetailPage ? 'verified_manual_import' : 'manual_review_required';
      }
      if (imageUrl) {
        target.imageUrl = imageUrl;
        target.imageAlt = imageAlt || target.name;
        target.verifiedImage = true;
        target.imageStatus = hasOliveImage(imageUrl) ? 'verified_manual_import' : 'manual_input';
      }
      target.mediaUpdatedAt = new Date().toISOString();
      updated += 1;
    });
    db.data.products = products.map(ensureProductDefaults);
    db.data.scan_meta.last_media_upload_at = new Date().toISOString();
    db.data.scan_meta.last_media_upload_count = updated;
    await db.write();
    fs.unlinkSync(req.file.path);
    res.json({
      updated,
      verifiedDetailCount: db.data.products.filter(p => p.verifiedDetailPage).length,
      imageCount: db.data.products.filter(p => p.imageUrl).length
    });
  } catch (error) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(500).json({ error: '미디어 업로드 파싱에 실패했습니다.' });
  }
});

app.post('/api/products/:id/media', requireAuth, async (req, res) => {
  await db.read();
  const target = db.data.products.find(p => p.id === req.params.id);
  if (!target) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
  const detailPageUrl = String(req.body.detailPageUrl || '').trim();
  const imageUrl = String(req.body.imageUrl || '').trim();
  const imageAlt = String(req.body.imageAlt || target.name || '').trim();

  target.detailPageUrl = detailPageUrl;
  target.verifiedDetailPage = Boolean(normalizeDetailPageUrl(detailPageUrl));
  target.detailPageStatus = detailPageUrl ? (target.verifiedDetailPage ? 'verified_manual_input' : 'manual_review_required') : 'pending_verification';
  target.imageUrl = imageUrl;
  target.imageAlt = imageAlt || target.name;
  target.verifiedImage = Boolean(imageUrl);
  target.imageStatus = imageUrl ? (hasOliveImage(imageUrl) ? 'verified_manual_input' : 'manual_input') : 'pending_image';
  target.mediaUpdatedAt = new Date().toISOString();

  db.data.products = db.data.products.map(ensureProductDefaults);
  await db.write();
  res.json({ product: ensureProductDefaults(target) });
});

app.get('/api/consultations', requireAuth, async (_req, res) => {
  await db.read();
  res.json({ consultations: db.data.consultations.slice().reverse() });
});

app.post('/api/recommend', requireAuth, async (req, res) => {
  const profile = req.body || {};
  await db.read();
  const products = db.data.products.map(ensureProductDefaults);
  const categoryFiltered = (profile.category && profile.category !== 'all')
    ? products.filter(product => matchesRequestedCategory(product, profile.category))
    : products.slice();
  const pool = categoryFiltered.length ? categoryFiltered : products;
  const exposureMap = buildRecentExposureMap(db.data.consultations || []);
  const ranked = diversifyRecommendations(
    pool
      .map(product => scoreProduct(product, profile, exposureMap))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.ingredientStatus !== b.ingredientStatus) return a.ingredientStatus === 'completed' ? -1 : 1;
        if (a.verifiedDetailPage !== b.verifiedDetailPage) return a.verifiedDetailPage ? -1 : 1;
        return Number(a.price || 0) - Number(b.price || 0);
      }),
    5
  );

  res.json({
    recommendations: ranked,
    meta: {
      strictCategoryApplied: Boolean(profile.category && profile.category !== 'all' && categoryFiltered.length),
      poolCount: pool.length,
      completedPoolCount: pool.filter(product => product.ingredientStatus === 'completed').length,
      verifiedDetailPoolCount: pool.filter(product => product.verifiedDetailPage).length,
      verifiedImagePoolCount: pool.filter(product => product.verifiedImage).length
    }
  });
});

app.post('/api/consultations', requireAuth, async (req, res) => {
  const { customerName, phone, profile, recommendations, note } = req.body;
  await db.read();
  const consultation = {
    id: nanoid(),
    customerName: customerName || '',
    phone: phone || '',
    profile: profile || {},
    recommendations: recommendations || [],
    note: note || '',
    createdAt: new Date().toISOString(),
    createdBy: req.session.userId
  };
  db.data.consultations.push(consultation);
  await db.write();
  res.json({ consultation });
});

app.get('/api/dashboard', requireAuth, async (_req, res) => {
  await db.read();
  const products = db.data.products.map(ensureProductDefaults);
  const consultations = db.data.consultations;
  const stats = {
    productCount: products.length,
    consultationCount: consultations.length,
    lowStockCount: products.filter(p => Number(p.inventory || 0) <= 5).length,
    sensitiveFitCount: products.filter(p => /병풀|마데카소사이드|판테놀|알란토인/.test(p.ingredientsRaw || '')).length,
    acneFitCount: products.filter(p => /징크|살리실산|나이아신아마이드/.test(p.ingredientsRaw || '')).length,
    barrierFitCount: products.filter(p => /세라마이드|판테놀|히알루론산/.test(p.ingredientsRaw || '')).length,
    brandCount: unique(products.map(p => p.brand)).length,
    pendingIngredientCount: products.filter(p => p.ingredientStatus === 'pending_full_ingredients').length,
    completedIngredientCount: products.filter(p => p.ingredientStatus === 'completed').length
  };
  res.json({ stats, rules: db.data.rules });
});

app.get('/api/rules', requireAuth, async (_req, res) => {
  await db.read();
  res.json({ rules: db.data.rules });
});

app.get('/api/pipeline/status', requireAuth, async (_req, res) => {
  await db.read();
  db.data.products = db.data.products.map(ensureProductDefaults);
  db.data.pipeline.ingredientEnrichmentQueue = seedIngredientQueue(db.data.products);
  db.data.pipeline.categoryExpansionPlans = buildExpansionPlan(db.data.categories || [], db.data.products, db.data.pipeline.categoryExpansionPlans || []);
  await db.write();
  const stats = buildPipelineStats(db.data);
  res.json({
    stats,
    pendingProducts: db.data.products.filter(p => p.ingredientStatus === 'pending_full_ingredients').slice(0, 50),
    expansionPlans: db.data.pipeline.categoryExpansionPlans.slice().sort((a, b) => b.gapCount - a.gapCount),
    queue: db.data.pipeline.ingredientEnrichmentQueue.slice(0, 80),
    meta: db.data.scan_meta || {}
  });
});

app.get('/api/pipeline/ingredients-template', requireAuth, async (_req, res) => {
  await db.read();
  const rows = db.data.products
    .map(ensureProductDefaults)
    .filter(p => p.ingredientStatus === 'pending_full_ingredients')
    .map(p => ({
      product_id: p.id,
      product_name: p.name,
      brand: p.brand,
      category: p.category,
      subcategory: p.subcategory || '',
      price: p.price,
      inventory: p.inventory,
      source_url: p.sourceUrl || '',
      ingredient_status: p.ingredientStatus,
      ingredients: ''
    }));
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows.length ? rows : [{ product_id: '', product_name: '', brand: '', category: '', subcategory: '', price: '', inventory: '', source_url: '', ingredient_status: 'pending_full_ingredients', ingredients: '' }]);
  xlsx.utils.book_append_sheet(wb, ws, 'pending_ingredients');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="pending_ingredients_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

app.post('/api/pipeline/ingredients-import', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '업로드 파일이 없습니다.' });
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    await db.read();
    const products = db.data.products.map(ensureProductDefaults);
    let updated = 0;
    rows.forEach(row => {
      const productId = String(row.product_id || row['product_id'] || row['상품ID'] || '').trim();
      const productName = String(row.product_name || row.name || row['상품명'] || '').trim();
      const ingredientsRaw = String(row.ingredients || row.ingredients_raw || row['전성분'] || '').trim();
      if (!ingredientsRaw) return;
      const target = products.find(p => (productId && p.id === productId) || (productName && p.name === productName));
      if (!target) return;
      target.ingredientsRaw = ingredientsRaw;
      target.ingredientsNormalized = normalizeIngredients(ingredientsRaw);
      target.ingredientStatus = 'completed';
      target.ingredientUpdatedAt = new Date().toISOString();
      updated += 1;
    });
    db.data.products = products;
    db.data.pipeline.ingredientEnrichmentQueue = seedIngredientQueue(db.data.products);
    db.data.pipeline.categoryExpansionPlans = buildExpansionPlan(db.data.categories || [], db.data.products, db.data.pipeline.categoryExpansionPlans || []);
    db.data.scan_meta.last_ingredient_upload_at = new Date().toISOString();
    db.data.scan_meta.last_ingredient_upload_count = updated;
    await db.write();
    fs.unlinkSync(req.file.path);
    res.json({ updated, pendingLeft: db.data.products.filter(p => p.ingredientStatus === 'pending_full_ingredients').length });
  } catch (error) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(500).json({ error: '전성분 업로드 파싱에 실패했습니다.' });
  }
});

app.post('/api/pipeline/seed-expansion', requireAuth, async (_req, res) => {
  await db.read();
  db.data.pipeline.categoryExpansionPlans = buildExpansionPlan(db.data.categories || [], db.data.products.map(ensureProductDefaults), db.data.pipeline.categoryExpansionPlans || []);
  db.data.scan_meta.last_expansion_seed_at = new Date().toISOString();
  await db.write();
  res.json({ plans: db.data.pipeline.categoryExpansionPlans, count: db.data.pipeline.categoryExpansionPlans.length });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`SPA operational PWA running on http://localhost:${PORT}`);
  });
});
