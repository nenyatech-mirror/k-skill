// Financial Services Commission (FSC) corporate-outline API wrapper.
// Proxies data.go.kr 15043184 (GetCorpBasicInfoService_V2/getCorpOutline_V2)
// and keeps the operator's DATA_GO_KR_API_KEY server-side.
//
// The upstream search parameters are crno (13-digit corporate registration
// number) and corpNm (corporate name) only — the 10-digit business number
// cannot query it directly. We search by corpNm and, when the response carries
// a bzno field, cross-check it against the supplied business number without
// asserting identity when it is absent.

const FSC_CORP_OUTLINE_URL =
  "https://apis.data.go.kr/1160100/service/GetCorpBasicInfoService_V2/getCorpOutline_V2";

function trimOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function digitsOnly(value) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function normalizeFscCorpQuery(query = {}) {
  const corpNm = trimOrNull(query.corpNm ?? query.name ?? query.b_nm);
  if (!corpNm) {
    throw new Error(
      "Provide corpNm (corporate name). The FSC outline API cannot be queried by the 10-digit business number alone."
    );
  }
  const bnoDigits = digitsOnly(query.b_no ?? query.bno);
  return { corpNm, bno: bnoDigits || null };
}

// Extracts the item list from the JSON envelope, tolerating the empty-string
// `items` variant data.go.kr returns for zero results.
function extractCorpItems(payload) {
  const header = payload?.response?.header ?? {};
  const resultCode = String(header.resultCode ?? "");
  if (resultCode && !["00", "0"].includes(resultCode)) {
    throw new Error(`resultCode=${resultCode} ${header.resultMsg ?? ""}`.trim());
  }
  const itemsNode = payload?.response?.body?.items;
  if (!itemsNode || typeof itemsNode !== "object") {
    return [];
  }
  let item = itemsNode.item;
  if (!item) {
    return [];
  }
  if (!Array.isArray(item)) {
    item = [item];
  }
  return item;
}

async function fetchFscCorpOutline({ corpNm, bno = null, serviceKey, fetchImpl = global.fetch }) {
  const url = new URL(FSC_CORP_OUTLINE_URL);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "10");
  url.searchParams.set("resultType", "json");
  url.searchParams.set("corpNm", corpNm);

  const doFetch = fetchImpl || global.fetch;
  let response;
  try {
    response = await doFetch(url.toString(), { signal: AbortSignal.timeout(20000) });
  } catch (err) {
    return { error: "upstream_timeout", message: `Upstream request failed: ${err.message}` };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      error: "upstream_forbidden",
      message: `FSC upstream returned ${response.status}. The proxy key may not be approved for service 15043184.`,
    };
  }
  if (!response.ok) {
    return { error: "upstream_error", message: `Upstream returned ${response.status}` };
  }

  let payload;
  try {
    payload = JSON.parse(await response.text());
  } catch {
    return { error: "upstream_invalid_response", message: "FSC upstream did not return valid JSON." };
  }

  let items;
  try {
    items = extractCorpItems(payload);
  } catch (err) {
    return { error: "upstream_error", message: `FSC upstream error response: ${err.message}` };
  }

  const hasBzno = items.some((it) => "bzno" in it);
  const matched = hasBzno && bno ? items.filter((it) => digitsOnly(it.bzno) === bno) : [];

  return {
    query_corp_nm: corpNm,
    candidate_count: items.length,
    candidates: items,
    b_no_cross_check: {
      checked: Boolean(hasBzno && bno),
      input_b_no: bno,
      matched_candidates: matched,
    },
    notes:
      items.length && !hasBzno
        ? "The response carries no business-number field, so the input number could not be cross-checked — only name-matched candidates are listed (crno is the separate corporate registration number)."
        : undefined,
  };
}

module.exports = {
  FSC_CORP_OUTLINE_URL,
  normalizeFscCorpQuery,
  extractCorpItems,
  fetchFscCorpOutline,
};
