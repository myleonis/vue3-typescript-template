import { BASE_URL, SUCCESS_CODE } from '@/config'
import { ContentType, FetchService } from './interceptorFetch'

interface ResultResponse<T> {
  code: number
  status: string
  message: string
  data: T
}

const TOKEN = 'token' // 自定义token

const headers = new Headers({
  /**
    json: 'application/json;charset=UTF-8', // json数据格式
    form: 'application/x-www-form-urlencoded; charset=UTF-8', // 表单数据格式
    download: 'application/octet-stream' // 二进制文件流格式，用于download
   */
  'Content-Type': 'application/json;charset=UTF-8',
  'Access-Control-Allow-Credentials': 'true',
  Accept: 'application/json, text/plain, */*'
  /**
   * include:
   * 默认不论是不是跨域的请求
   * 总是发送请求资源域在本地的 cookies、HTTP Basic authentication 等验证信息
   * omit: 从不发送cookies
   * same-origin: 同源发送cookies
   */
  // credentials: "include",
})

const fetchService = new FetchService(headers)

// 添加一个请求拦截器
fetchService.interceptors.request((mutable, options, body) => {
  const { method } = options
  // 查看当前本地是否有token, 如果有，设置自定义headers中TOKEN
  const token = localStorage.getItem(TOKEN)
  if (token) {
    headers.append('Authorization', token)
  }
  mutable.url = BASE_URL + mutable.url
  // get请求没有请求体，需要将参数拼接到url上
  if (method?.toUpperCase() === 'GET' && body?.constructor === Object) {
    const paramsArray: any[] = []
    Object.keys(body).forEach((key) => {
      body[key] && paramsArray.push(key + '=' + encodeURIComponent(body[key]))
    })
    if (mutable.url.search(/\?/) === -1) {
      mutable.url += '?' + paramsArray.join('&')
    } else {
      mutable.url += '&' + paramsArray.join('&')
    }

    // 删除请求体属性
    delete options.body
  } else if (method?.toUpperCase() === 'POST') {
    options.body = JSON.stringify(body)
    mutable.contentType === 'download' && headers.set('Content-Type', 'application/octet-stream')
  } else if (method?.toUpperCase() === 'PUT') {
    options.body = JSON.stringify(body)
  }
})

// 响应拦截器
fetchService.interceptors.response((response, iserror) => {
  console.log('response====>:', response)
  if (!iserror) return
  if (response.status === 401) {
    console.error('Unauthorized!')
  } else if (response.status === 404) {
    alert('服务器丢了')
  }
})

// 响应信息拦截器
fetchService.interceptors.responseMsg((data, iserror) => {
  console.log('response====>:', data)
  if (!iserror) return
  if (data.code < SUCCESS_CODE) {
    alert(data.message)
  }
})

export async function HTTP<T>({
  url,
  method,
  data,
  setting = { iserror: true, contentType: 'json' }
}: {
  url: string
  method: string
  data?: any
  setting?: { iserror?: boolean; contentType?: ContentType }
}): Promise<ResultResponse<T>> {
  const response = await fetchService.request<ResultResponse<T>>(url, method, data, setting)
  return response
}
