import User from "./user.js";
import utils from './mys/utils.js';
import Common from "../components/Common.js";
export default class mysTopLogin {
    constructor(e) {
        this.e = e;
        this.init();
        //消息提示以及风险警告
        this.sendMsgUser = `免责声明:您将通过扫码完成获取米游社sk以及ck。\n本Bot将不会保存您的登录状态。\n我方仅提供米游社查询及相关游戏内容服务,若您的账号封禁、被盗等处罚与我方无关。\n害怕风险请勿扫码~`
    }
    async init() {
        this.user = new User(this.e)
    }
    //
    async qrCodeLogin() {
        let RedisData = await utils.redisGet(this.e.user_id, "GetQrCode")
        if (RedisData) {
            this.e.reply([segment.at(this.e.user_id), `前置二维码未扫描，请勿重复触发指令`])
            return false;
        }
        this.device = await utils.randomString(64)
        this.e.reply(this.sendMsgUser)
        let res = await this.user.getData("qrCodeLogin", {
            device: this.device
        },false)
        if (!res.data) {
            return false;
        }
        res.data["ticket"] = res?.data?.url.split("ticket=")[1]
        return res
    }
    async GetQrCode(ticket) {
        await utils.redisSet(this.e.user_id, "GetQrCode", { GetQrCode: 1 }, 60 * 5) //设置5分钟缓存避免重复触发
        let res;
        let RedisData = await utils.redisGet(this.e.user_id, "GetQrCode")
        for (let n = 1; n < 60; n++) {
            await utils.sleepAsync(5000)
            res = await this.user.getData("qrCodeQuery", {
                device: this.device, ticket
            },false)
            if (res?.data?.stat == "Scanned" && RedisData.GetQrCode == 1) {
                Bot.logger.mark(JSON.stringify(res))
                await this.e.reply("二维码已扫描，请确认登录", true)
                RedisData.GetQrCode++;
            }
            if (res?.data?.stat == "Confirmed") {
                Bot.logger.mark(JSON.stringify(res))
                break
            }
        }
        await utils.redisDel(this.e.user_id, 'GetQrCode')
        if (!res?.data?.payload?.raw) {
            await this.e.reply("验证超时", true)
            return false
        }
        let raw = JSON.parse(res?.data?.payload?.raw)
        let UserData = await this.user.getData("getTokenByGameToken", raw,false)
        let ck = await this.user.getData("getCookieAccountInfoByGameToken", raw,false)
        return {
            cookie: `ltoken=${UserData.data?.token?.token};ltuid=${UserData.data?.user_info?.aid};cookie_token=${ck.data?.cookie_token}`,
            stoken: `stoken=${UserData.data?.token?.token};stuid=${UserData.data?.user_info?.aid};mid=${UserData?.data?.user_info.mid}`
        }
    }

}