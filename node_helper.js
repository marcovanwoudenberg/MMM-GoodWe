/* eslint-disable prettier/prettier */

const fetch = global.fetch || require("node-fetch");
const crypto = require("node:crypto");
const NodeHelper = require("node_helper");
const GoodWeOptions = require("./goodwe-options.json");

const semsPlusLoginUrl =
        "https://eu-semsplus.goodwe.com/web/sems/sems-user/api/v1/auth/cross-login";

let semsPlusSession = null;

module.exports = NodeHelper.create({
        start: async function () {
                console.log("Starting node helper: " + this.name);
        },

        gatewaySignature: function (uid, token) {
                const timestamp = Date.now();

                const hash = crypto
                        .createHash("sha256")
                        .update(
                                `${timestamp}@${uid}@${token}`,
                                "utf8"
                        )
                        .digest("hex");

                return Buffer
                        .from(
                                `${hash}@${timestamp}`,
                                "utf8"
                        )
                        .toString("base64");
        },

        loginSemsPlus: async function () {
                const username =
                        process.env.GOODWE_USERNAME;

                const password =
                        process.env.GOODWE_PASSWORD;

                const uuid =
                        process.env.GOODWE_SEMSPLUS_UUID;

                if (!username || !password) {
                        throw new Error(
                                "GoodWe credentials are not configured in the environment"
                        );
                }

                if (!uuid) {
                        throw new Error(
                                "GOODWE_SEMSPLUS_UUID is not configured in the environment"
                        );
                }

                const loginToken = {
                        uid: "",
                        timestamp: 0,
                        token: "",
                        client: "semsPlusWeb",
                        version: "",
                        language: "nl"
                };

                const md5Hex = crypto
                        .createHash("md5")
                        .update(
                                password,
                                "utf8"
                        )
                        .digest("hex");

                const passwordHash = Buffer
                        .from(
                                md5Hex,
                                "utf8"
                        )
                        .toString("base64");

                const loginDetails = {
                        account: username,
                        pwd: passwordHash,
                        agreement: 1,
                        isChinese: false,
                        isLocal: false
                };

                const options = {
                        method: "POST",
                        body: JSON.stringify(
                                loginDetails
                        ),
                        headers: {
                                "Content-Type":
                                        "application/json",

                                "Accept":
                                        "application/json, text/plain, */*",

                                "token":
                                        JSON.stringify(
                                                loginToken
                                        ),

                                "uuid":
                                        uuid,

                                "x-signature":
                                        this.gatewaySignature(
                                                "",
                                                ""
                                        ),

                                "currentlang":
                                        "nl",

                                "Origin":
                                        "https://eu-semsplus.goodwe.com",

                                "Referer":
                                        "https://eu-semsplus.goodwe.com/",

                                "User-Agent":
                                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                                        "AppleWebKit/537.36 (KHTML, like Gecko) " +
                                        "Chrome/153.0.0.0 Safari/537.36"
                        }
                };

                const res = await fetch(
                        semsPlusLoginUrl,
                        options
                );

                console.log(
                        `[SEMS-PLUS][${res.status}] Login request completed`
                );

                const data = await res.json();

                if (
                        !res.ok ||
                        data.code !== "00000"
                ) {
                        throw new Error(
                                `SEMS+ login failed: ${data.code ||
                                res.status
                                }`
                        );
                }

                console.log(
                        "[SEMS-PLUS] Authenticated successfully"
                );

                return data.data;
        },

        getAlarmPage: async function (stationId) {
                if (!semsPlusSession) {
                        throw new Error(
                                "No active SEMS+ session available"
                        );
                }

                if (!stationId) {
                        throw new Error(
                                "No stationId supplied for SEMS+ alarm request"
                        );
                }

                const gatewayBase =
                        semsPlusSession.api;

                const url =
                        `${gatewayBase}/sems-alarm/api/v2/alarm/page`;

                const tokenPayload = {
                        uid:
                                semsPlusSession.uid,

                        timestamp:
                                String(
                                        semsPlusSession.timestamp
                                ),

                        token:
                                semsPlusSession.token,

                        client:
                                "semsPlusWeb",

                        version:
                                "",

                        language:
                                "nl",

                        api:
                                gatewayBase,

                        region:
                                semsPlusSession.region ||
                                "eu",

                        uuid:
                                semsPlusSession.uuid ||
                                process.env.GOODWE_SEMSPLUS_UUID
                };

                const now = new Date();
                const start = new Date(now);

                start.setDate(
                        start.getDate() - 90
                );

                const pad = (value) =>
                        String(value).padStart(
                                2,
                                "0"
                        );

                const formatDate = (
                        date,
                        endOfDay = false
                ) => {
                        return (
                                `${date.getFullYear()}-` +
                                `${pad(date.getMonth() + 1)}-` +
                                `${pad(date.getDate())} ` +
                                (
                                        endOfDay
                                                ? "23:59:59"
                                                : "00:00:00"
                                )
                        );
                };

                const alarmRequest = {
                        stationId:
                                stationId,

                        startTime:
                                formatDate(start),

                        endTime:
                                formatDate(
                                        now,
                                        true
                                ),

                        pageIndex:
                                1,

                        pageSize:
                                15,

                        status:
                                1,

                        timeType:
                                1
                };

                const options = {
                        method: "POST",

                        body:
                                JSON.stringify(
                                        alarmRequest
                                ),

                        headers: {
                                "Content-Type":
                                        "application/json",

                                "Accept":
                                        "application/json, text/plain, */*",

                                "User-Agent":
                                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                                        "AppleWebKit/537.36 (KHTML, like Gecko) " +
                                        "Chrome/153.0.0.0 Safari/537.36",

                                "token":
                                        JSON.stringify(
                                                tokenPayload
                                        ),

                                "uuid":
                                        semsPlusSession.uuid ||
                                        process.env.GOODWE_SEMSPLUS_UUID,

                                "x-signature":
                                        this.gatewaySignature(
                                                semsPlusSession.uid,
                                                semsPlusSession.token
                                        )
                        }
                };

                const res = await fetch(
                        url,
                        options
                );

                const data =
                        await res.json();

                if (
                        !res.ok ||
                        data.code !== "00000"
                ) {
                        throw new Error(
                                `SEMS+ alarm request failed: ${data.code ||
                                res.status
                                }`
                        );
                }

                const alarms =
                        data.data?.dataList ||
                        [];

                console.log(
                        `[SEMS-ALARM] Received ${alarms.length} alarm(s)`
                );

                this.sendSocketNotification(
                        "ALARM_DATA",
                        alarms
                );

                return alarms;
        },

        // Temporary read-only SEMS+ station discovery. No identifiers or tokens are logged.
        diagnoseSemsPlusStation: async function (stationId) {
                if (!stationId || !semsPlusSession?.api) {
                        throw new Error("Missing station ID or SEMS+ session");
                }

                const gateway = semsPlusSession.api.replace(/\/$/, "");
                const headers = {
                        "Accept": "application/json, text/plain, */*",
                        "token": JSON.stringify({
                                uid: semsPlusSession.uid,
                                timestamp: String(semsPlusSession.timestamp),
                                token: semsPlusSession.token,
                                client: "semsPlusWeb",
                                version: "",
                                language: "nl",
                                api: semsPlusSession.api,
                                region: semsPlusSession.region || "eu",
                                uuid: semsPlusSession.uuid || process.env.GOODWE_SEMSPLUS_UUID
                        }),
                        "uuid": semsPlusSession.uuid || process.env.GOODWE_SEMSPLUS_UUID,
                        "x-signature": this.gatewaySignature(semsPlusSession.uid, semsPlusSession.token)
                };

                const endpoints = [
                        {
                                name: "device-types",
                                path: "/sems-plant/api/web/device/getAllDeviceType?stationId=" + encodeURIComponent(stationId)
                        },
                        {
                                name: "device-status",
                                path: "/sems-plant/api/stations/device/all-status?stationId=" + encodeURIComponent(stationId)
                        }
                ];

                for (const endpoint of endpoints) {
                        try {
                                const response = await fetch(gateway + endpoint.path, {
                                        method: "GET",
                                        headers,
                                        signal: AbortSignal.timeout(15000)
                                });
                                const contentType = response.headers.get("content-type") || "";
                                if (!contentType.includes("json")) {
                                        console.warn(`[SEMS-PLUS][DIAG] ${endpoint.name}: HTTP ${response.status}, non-JSON response`);
                                        continue;
                                }
                                const result = await response.json();
                                const details = result?.data?.deviceDetailList;
                                const statusGroups = Array.isArray(details) ? details.flatMap(item => Array.isArray(item?.statusDetailList) ? item.statusDetailList : []) : [];
                                // Schema-only diagnostics: never print API values, IDs, or credentials.
                                // Inspect at most one array element per level and bound output size.
                                const schemaPaths = [];
                                const inspectShape = (value, path, depth) => {
                                        if (schemaPaths.length >= 65 || depth > 8 || value == null) return;
                                        if (Array.isArray(value)) {
                                                schemaPaths.push(`${path}[] (array)`);
                                                if (value.length > 0) inspectShape(value[0], `${path}[]`, depth + 1);
                                                return;
                                        }
                                        if (typeof value !== "object") {
                                                schemaPaths.push(`${path} (${typeof value})`);
                                                return;
                                        }
                                        const keys = Object.keys(value).filter(key =>
                                                /^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(key) &&
                                                !/(token|password|secret|uuid|serial|sn$|email|phone|account|user|signature|address|imei|mac|uid|id$|name)/i.test(key)
                                        );
                                        for (const key of keys.slice(0, 32)) {
                                                if (schemaPaths.length >= 65) break;
                                                inspectShape(value[key], `${path}.${key}`, depth + 1);
                                        }
                                };
                                inspectShape(result?.data, "data", 0);
                                console.log(`[SEMS-PLUS][SCHEMA-V3] ${endpoint.name}: ${JSON.stringify(schemaPaths)}`);
                                if (endpoint.name === "device-status" && response.ok && result?.code === "00000") {
                                        const inverters = [];
                                        for (const group of (Array.isArray(details) ? details : [])) {
                                                if (group?.deviceType !== "INVERTER") continue;
                                                for (const statusGroup of (Array.isArray(group.statusDetailList) ? group.statusDetailList : [])) {
                                                        for (const sn of (Array.isArray(statusGroup.snList) ? statusGroup.snList : [])) {
                                                                if (typeof sn === "string" && sn.length && inverters.length < 2 && !inverters.includes(sn)) inverters.push(sn);
                                                        }
                                                }
                                        }
                                        console.log("[SEMS-PLUS][TELEMETRY-V4] inverterCountForTest:", inverters.length);
                                        for (const sn of inverters) {
                                                try {
                                                        const path = `/sems-plant/api/equipments/${encodeURIComponent(sn)}/telemetry?deviceType=INVERTER&pwId=${encodeURIComponent(stationId)}`;
                                                        const telemetryResponse = await fetch(gateway + path, {
                                                                method: "GET",
                                                                headers: { ...headers, "x-signature": this.gatewaySignature(semsPlusSession.uid, semsPlusSession.token) },
                                                                signal: AbortSignal.timeout(15000)
                                                        });
                                                        const telemetryType = telemetryResponse.headers.get("content-type") || "";
                                                        if (!telemetryType.includes("json")) {
                                                                console.warn(`[SEMS-PLUS][TELEMETRY-V4] HTTP ${telemetryResponse.status}, non-JSON`);
                                                                continue;
                                                        }
                                                        const telemetry = await telemetryResponse.json();
                                                        const paths = [];
                                                        const shape = (value, path, depth) => {
                                                                if (paths.length >= 100 || depth > 7 || value == null) return;
                                                                if (Array.isArray(value)) {
                                                                        paths.push(`${path}[] (array)`);
                                                                        if (value.length) shape(value[0], `${path}[]`, depth + 1);
                                                                } else if (typeof value === "object") {
                                                                        for (const key of Object.keys(value).slice(0, 45)) {
                                                                                if (!/^[a-zA-Z][a-zA-Z0-9_:-]{0,49}$/.test(key) || /(token|password|secret|uuid|serial|sn$|email|phone|account|user|signature|address|imei|mac|uid|id$|name)/i.test(key)) continue;
                                                                                shape(value[key], `${path}.${key}`, depth + 1);
                                                                        }
                                                                } else {
                                                                        paths.push(`${path} (${typeof value})`);
                                                                }
                                                        };
                                                        shape(telemetry?.data, "data", 0);
                                                        // Diagnostic v5: list only measurement identifiers and types, never values or aliases.
                                                        const safeIdentifier = (value) =>
                                                                typeof value === "string" && /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(value)
                                                                        ? value
                                                                        : null;
                                                        const fields = [];
                                                        const groups = Array.isArray(telemetry?.data) ? telemetry.data : [];
                                                        for (const group of groups.slice(0, 30)) {
                                                                const groupCode = safeIdentifier(group?.code);
                                                                const factors = Array.isArray(group?.factors) ? group.factors : [];
                                                                for (const factor of factors.slice(0, 100)) {
                                                                        const code = safeIdentifier(factor?.code);
                                                                        if (!code) continue;
                                                                        fields.push({
                                                                                group: groupCode,
                                                                                code,
                                                                                dataType: safeIdentifier(factor?.dataType),
                                                                                hasData: factor?.data != null && String(factor.data).length > 0
                                                                        });
                                                                        if (fields.length >= 160) break;
                                                                }
                                                                if (fields.length >= 160) break;
                                                        }
                                                        console.log(`[SEMS-PLUS][TELEMETRY-V5] ${JSON.stringify({
                                                                inverterIndex: inverters.indexOf(sn) + 1,
                                                                httpStatus: telemetryResponse.status,
                                                                apiCode: telemetry?.code ?? null,
                                                                groupCount: groups.length,
                                                                fieldCount: fields.length,
                                                                fields
                                                        })}`);
                                                } catch (error) {
                                                        console.warn(`[SEMS-PLUS][TELEMETRY-V4] request failed: ${error.name === "TimeoutError" ? "timeout" : "request/parse error"}`);
                                                }
                                        }
                                }
                                console.log("[SEMS-PLUS][DIAG]", {
                                        endpoint: endpoint.name,
                                        httpStatus: response.status,
                                        apiCode: typeof result?.code === "string" || typeof result?.code === "number" ? result.code : null,
                                        dataIsArray: Array.isArray(result?.data),
                                        deviceTypeCount: Array.isArray(result?.data) ? result.data.length : null,
                                        deviceGroupCount: Array.isArray(details) ? details.length : null,
                                        statusGroupCount: statusGroups.length,
                                        hasData: result?.data != null
                                });
                        } catch (error) {
                                console.warn(`[SEMS-PLUS][DIAG] ${endpoint.name} failed: ${error.name === "TimeoutError" ? "timeout" : "request/parse error"}`);
                        }
                }
        },


        // SEMS+ live AC power, using the confirmed device-status and telemetry endpoints.
        // Values are displayed as supplied until their units have been verified.
        getSemsPlusPower: async function (stationId, retry = true) {
                if (!stationId) return;
                try {
                        if (!semsPlusSession) semsPlusSession = await this.loginSemsPlus();
                        const gateway = semsPlusSession.api.replace(/\/$/, "");
                        const headers = {
                                "Accept": "application/json, text/plain, */*",
                                "token": JSON.stringify({
                                        uid: semsPlusSession.uid,
                                        timestamp: String(semsPlusSession.timestamp),
                                        token: semsPlusSession.token,
                                        client: "semsPlusWeb", version: "", language: "nl",
                                        api: semsPlusSession.api,
                                        region: semsPlusSession.region || "eu",
                                        uuid: semsPlusSession.uuid || process.env.GOODWE_SEMSPLUS_UUID
                                }),
                                "uuid": semsPlusSession.uuid || process.env.GOODWE_SEMSPLUS_UUID
                        };
                        const request = async (path) => {
                                const response = await fetch(gateway + path, {
                                        method: "GET",
                                        headers: { ...headers, "x-signature": this.gatewaySignature(semsPlusSession.uid, semsPlusSession.token) },
                                        signal: AbortSignal.timeout(15000)
                                });
                                if (!(response.headers.get("content-type") || "").includes("json")) throw new Error(`Non-JSON response (HTTP ${response.status})`);
                                const result = await response.json();
                                if (!response.ok || result?.code !== "00000") throw new Error(`SEMS+ API error (HTTP ${response.status})`);
                                return result.data;
                        };
                        const status = await request(`/sems-plant/api/stations/device/all-status?stationId=${encodeURIComponent(stationId)}`);
                        const serials = [];
                        for (const group of (status?.deviceDetailList || [])) {
                                if (group?.deviceType !== "INVERTER") continue;
                                for (const state of (group.statusDetailList || [])) {
                                        for (const sn of (state.snList || [])) {
                                                if (typeof sn === "string" && sn && !serials.includes(sn)) serials.push(sn);
                                        }
                                }
                        }
                        const power = [];
                        for (const sn of serials) {
                                const groups = await request(`/sems-plant/api/equipments/${encodeURIComponent(sn)}/telemetry?deviceType=INVERTER&pwId=${encodeURIComponent(stationId)}`);
                                const factor = (Array.isArray(groups) ? groups : []).flatMap(g => Array.isArray(g.factors) ? g.factors : []).find(f => f?.code === "pAc");
                                const raw = factor?.data;
                                // SEMS+ pAc is expressed in kW (verified against the SEMS+ UI).
                                // Do not turn missing, invalid or negative readings into zero.
                                const normalized = typeof raw === "string" ? raw.trim().replace(",", ".") : raw;
                                const kw = normalized === "" || normalized == null ? NaN : Number(normalized);
                                const watts = Number.isFinite(kw) && kw >= 0 ? Math.round(kw * 1000) : null;
                                power.push({ label: `Omvormer ${power.length + 1}`, watts });
                        }
                        console.log(`[SEMS-PLUS][POWER-V7] Received power fields for ${power.length} inverter(s)`);
                        this.sendSocketNotification("SOLAR_POWER", power);
                } catch (error) {
                        if (retry) {
                                try {
                                        semsPlusSession = await this.loginSemsPlus();
                                        return await this.getSemsPlusPower(stationId, false);
                                } catch (_) { /* error reported below */ }
                        }
                        console.warn("[SEMS-PLUS][POWER-V7] Unable to refresh power data:", error.message);
                }
        },

        socketNotificationReceived: async function (
                notification,
                payload
        ) {
                if (notification === "GET_SOLAR") {
                        await this.getSemsPlusPower(payload?.config?.powerstationId);
                        return;

                } else if (notification === "LOGIN_USER") {
                        try {
                                semsPlusSession = await this.loginSemsPlus();
                                console.log("[SEMS-PLUS] Session established; checking station endpoints");
                                const stationId = payload?.powerstationId;
                                if (stationId) {
                                        await this.getSemsPlusPower(stationId);
                                        await this.getAlarmPage(stationId);
                                } else {
                                        console.warn("[SEMS-PLUS] Station not configured");
                                }
                        } catch (error) {
                                console.error("[SEMS-PLUS] Initialization failed:", error.message);
                        }
                } else if (
                        notification ===
                        "GET_ALARMS"
                ) {
                        const stationId =
                                payload?.powerstationId;

                        if (!stationId) {
                                console.error(
                                        "[SEMS-ALARM] Alarm refresh skipped: no station configured"
                                );
                                return;
                        }

                        try {
                                if (!semsPlusSession) {
                                        semsPlusSession =
                                                await this.loginSemsPlus();
                                }

                                await this.getAlarmPage(
                                        stationId
                                );
                        } catch (error) {
                                console.warn(
                                        "[SEMS-ALARM] Refresh failed; renewing SEMS+ session"
                                );

                                try {
                                        semsPlusSession =
                                                await this.loginSemsPlus();

                                        await this.getAlarmPage(
                                                stationId
                                        );
                                } catch (retryError) {
                                        console.error(
                                                "[SEMS-ALARM] Refresh failed after session renewal:",
                                                retryError.message
                                        );
                                }
                        }

                } else if (
                        notification ===
                        "LOAD_OPTIONS"
                ) {
                        this.sendSocketNotification(
                                "LOAD_OPTIONS",
                                GoodWeOptions
                        );
                }
        }
});
