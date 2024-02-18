export type ContentType = 'json' | 'form' | 'download'

type RequestInterceptor = (mutable: { url: string; contentType?: string }, options: RequestInit, body?: any) => void
type ResponseInterceptor = (response: Response, iserror?: boolean) => void
type ResponseMsgInterceptor = (data: any, iserror?: boolean) => void

export class FetchService {
  private headers: Headers
  private timeOut = 6000 // 超时时间
  private mutable: { url: string; contentType?: ContentType } = { url: '', contentType: 'json' }
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private responseMsgInterceptors: ResponseMsgInterceptor[] = []

  public interceptors = {
    request: (interceptor: RequestInterceptor) => {
      this.requestInterceptors.push(interceptor)
    },
    response: (interceptor: ResponseInterceptor) => {
      this.responseInterceptors.push(interceptor)
    },
    responseMsg: (interceptor: ResponseMsgInterceptor) => {
      this.responseMsgInterceptors.push(interceptor)
    }
  }

  constructor(headers: Headers) {
    this.headers = headers
  }

  private runRequestInterceptors(options: RequestInit, body?: any): void {
    this.requestInterceptors.forEach((interceptor) => interceptor(this.mutable, options, body))
  }

  private runResponseInterceptors(response: Response, iserror?: boolean): void {
    this.responseInterceptors.forEach((interceptor) => interceptor(response, iserror))
  }

  private runResponseMsgInterceptors(data: any, iserror?: boolean): void {
    this.responseMsgInterceptors.forEach((interceptor) => interceptor(data, iserror))
  }

  async request<T>(url: string, method: string, body?: any, setting: { iserror?: boolean; contentType?: ContentType } = {}): Promise<T> {
    const options: RequestInit = {
      method: method,
      mode: 'cors',
      headers: this.headers
    }

    this.mutable.url = url
    this.mutable.contentType = setting.contentType

    this.runRequestInterceptors(options, body)
    // 利用 Promise.race 实现超时拦截
    try {
      const resultResponse = await Promise.race([
        new Promise<T>((_, reject) => {
          setTimeout(() => {
            reject(new Error('request timeout'))
          }, this.timeOut)
        }),
        new Promise<T>(async (resolve, reject) => {
          try {
            const modifiedUrl = this.mutable.url
            const response = await fetch(modifiedUrl, options)
            this.runResponseInterceptors(response, setting.iserror)
            const data = this.headers.get('Content-type') === 'application/octet-stream' ? await response.blob() : await response.json()
            this.runResponseMsgInterceptors(data, setting.iserror)
            resolve(data)
          } catch (error) {
            reject(error)
          }
        })
      ])

      return resultResponse
    } catch (error) {
      throw error
    }
  }
}
