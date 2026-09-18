/* eslint-disable prettier/prettier */

const fetch = global.fetch || require("node-fetch");
const crypto = require("node:crypto");
const NodeHelper = require("node_helper");
const GoodWeOptions = require("./goodwe-options.json");

const loginUrl =
        "https://www.semsportal.com/api/v2/Common/CrossLogin";

const powerStationURLPart =
        "v2/PowerStation/GetMonitorDetailByPowerstationId";

const semsPlusLoginUrl =
        "https://eu-semsplus.goodwe.com/web/sems/sems-user/api/v1/auth/cross-login";

let SEMSToken = null;
let APIUrl = null;
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

        loginUser: async function () {
                const username =
                        process.env.GOODWE_USERNAME;

                const password =
                        process.env.GOODWE_PASSWORD;

                if (!username || !password) {
                        throw new Error(
                                "GoodWe credentials are not configured in the environment"
                        );
                }

                const loginDetails = {
                        account: username,
                        pwd: password
                };

                const tokenHeader = {
                        version: "",
                        client: "ios",
                        language: "en"
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
                                        "application/json",
                                "token":
                                        JSON.stringify(
                                                tokenHeader
                                        )
                        }
                };

                const res = await fetch(
                        loginUrl,
                        options
                );

                if (!res.ok) {
                        throw new Error(
                                `SEMS legacy login failed with HTTP ${res.status}`
                        );
                }

                console.log(
                        `\x1b[32m[SEMS-API][${res.status}] - Authenticated\x1b[0m`
                );

                return res.json();
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
                                `SEMS+ login failed: ${
                                        data.code ||
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
                                `SEMS+ alarm request failed: ${
                                        data.code ||
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

                alarms.forEach((alarm) => {
                        console.log(
                                "[SEMS-ALARM]",
                                {
                                        name:
                                                alarm.warningNameEn ||
                                                alarm.warningname,

                                        code:
                                                alarm.warning_code,

                                        errorCode:
                                                alarm.error_code,

                                        happened:
                                                alarm.happentimes,

                                        recovered:
                                                alarm.recoverytimes ||
                                                null
                                }
                        );
                });

                this.sendSocketNotification(
                        "ALARM_DATA",
                        alarms
                );

                return alarms;
        },

        socketNotificationReceived: async function (
                notification,
                payload
        ) {
                if (notification === "GET_SOLAR") {
                        const getInfoUrl =
                                APIUrl +
                                powerStationURLPart;

                        const powerStationDetails = {
                                powerStationId:
                                        payload.config
                                                .powerstationId
                        };

                        const options = {
                                method: "POST",

                                body:
                                        JSON.stringify(
                                                powerStationDetails
                                        ),

                                headers: {
                                        "Content-Type":
                                                "application/json",

                                        "Accept":
                                                "application/json",

                                        "token":
                                                JSON.stringify(
                                                        SEMSToken
                                                )
                                }
                        };

                        try {
                                const res =
                                        await fetch(
                                                getInfoUrl,
                                                options
                                        );

                                if (!res.ok) {
                                        throw new Error(
                                                `Solar data request failed with HTTP ${res.status}`
                                        );
                                }

                                console.log(
                                        `\x1b[32m[SEMS-API][${res.status}] - Received Solar Data\x1b[0m`
                                );

                                const data =
                                        await res.json();

                                this.sendSocketNotification(
                                        "SOLAR_DATA",
                                        data["data"]
                                );
                        } catch (error) {
                                console.error(
                                        "[SEMS-API] Solar data request failed:",
                                        error.message
                                );
                        }

                } else if (
                        notification ===
                        "LOGIN_USER"
                ) {
                        try {
                                const res =
                                        await this.loginUser();

                                SEMSToken =
                                        res["data"];

                                APIUrl =
                                        res["api"];

                                this.sendSocketNotification(
                                        "LOGIN_USER",
                                        "Success"
                                );

                                semsPlusSession =
                                        await this.loginSemsPlus();

                                console.log(
                                        "[SEMS-PLUS] Session ready:",
                                        {
                                                client:
                                                        semsPlusSession.client,

                                                region:
                                                        semsPlusSession.region,

                                                api:
                                                        semsPlusSession.api
                                        }
                                );

                                const stationId =
                                        payload?.powerstationId;

                                if (stationId) {
                                        await this.getAlarmPage(
                                                stationId
                                        );
                                } else {
                                        console.log(
                                                "[SEMS-ALARM] No stationId available"
                                        );
                                }

                        } catch (error) {
                                console.error(
                                        "[MMM-GoodWe] Login failed:",
                                        error.message
                                );
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
