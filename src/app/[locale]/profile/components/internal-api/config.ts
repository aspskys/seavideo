export type EndpointEnv = 'dev' | 'prodInternal' | 'prodExternal'

export interface InternalApiSettings {
  apiKey: string
  projectCode: string
  activeLlmEndpoint: EndpointEnv
  activeMultimodalEndpoint: EndpointEnv
  geminiModels: Record<string, boolean>
}

export interface Sora2Param {
  name: string
  type: string
  required: boolean
  default?: string
  description: string
  enum?: string[]
}

export interface Wanx26Param {
  name: string
  type: string
  required: boolean
  default?: string
  description: string
  maxLength?: number
  enum?: string[]
  nested?: Wanx26Param[]
}

export interface VideoModelSpec {
  id: string
  name: string
  description: string
  method: string
  path: string
  mockUrl?: string
  apiDocUrl?: string
  params: (Sora2Param | Wanx26Param)[]
  responseFields: { name: string; type: string; description: string }[]
}

export const INTERNAL_API_CONFIG = {
  auth: {
    headerFormat: [
      { header: 'Authorization', value: 'Bearer {API_KEY}' },
      { header: 'X-Project', value: '{PROJECT_CODE}' },
      { header: 'X-Request-Id', value: '{REQUEST_ID}' },
    ],
  },

  endpoints: {
    llm: {
      dev: 'https://openresty-gateway.gpu-service.dev.seaart.dev/llm',
      prodInternal: 'http://openresty-gateway.api.production.private.seaart.dev/llm',
      prodExternal: 'https://openresty-gateway.api.seaart.ai/llm',
    },
    multimodal: {
      dev: 'https://openresty-gateway.gpu-service.dev.seaart.dev',
      prodInternal: 'http://openresty-gateway.api.production.private.seaart.dev',
      prodExternal: 'https://openresty-gateway.api.seaart.ai',
    },
    multimodalTaskCreate: '/model/v1/generation',
    multimodalTaskQuery: '/model/v1/generation/task/{id}',
  },

  geminiModels: [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-3.1-pro-preview',
  ] as const,

  videoModels: {
    sora2: {
      id: 'microsoft_sora2',
      name: 'Microsoft Sora2',
      description: 'Microsoft Sora2 视频生成。支持文本到视频和图像到视频的生成。',
      method: 'POST',
      path: '/api/v1/microsoft_sora2/generate',
      mockUrl: 'https://yapi.internal.ops.haiyiai.tech/mock/115/api/v1/microsoft_sora2/generate',
      params: [
        { name: 'prompt', type: 'string', required: true, description: '视频生成提示词，描述要生成的视频内容，长度必须在1-1000字符之间' },
        { name: 'size', type: 'string', required: false, description: "视频尺寸，格式为'宽x高'", enum: ['720x1280', '1280x720', '1024x1792', '1792x1024'] },
        { name: 'seconds', type: 'number', required: false, description: '视频时长（秒）', enum: ['4', '8', '12'] },
        { name: 'input_reference', type: 'string', required: false, description: '输入参考图像URL，用于图像到视频(I2V)生成' },
      ],
      responseFields: [
        { name: 'error', type: 'object', description: '错误信息，成功时为null' },
        { name: 'error.code', type: 'integer', description: '错误码：014001095(内部生成错误)、014001096(结果解析异常)、014001097(HTTP错误响应)、014001098(状态检查异常)、014001099(任务创建异常)' },
        { name: 'error.error_message', type: 'string', description: '错误消息' },
        { name: 'usage.input_tokens', type: 'integer|null', description: '输入令牌数' },
        { name: 'usage.output_tokens', type: 'integer|null', description: '输出令牌数' },
        { name: 'usage.total_tokens', type: 'integer|null', description: '总令牌数' },
        { name: 'usage.generated_videos', type: 'integer|null', description: '生成的视频数量' },
        { name: 'usage.video_duration', type: 'number|null', description: '视频时长（秒）' },
        { name: 'output[].content[].type', type: 'string', description: '资源类型，固定为 video' },
        { name: 'output[].content[].url', type: 'string', description: '生成的视频URL，已经过媒体处理器处理' },
        { name: 'output[].content[].size', type: 'number', description: '文件大小（字节）' },
        { name: 'output[].content[].jobId', type: 'string', description: '远程任务ID' },
        { name: 'output[].metadata', type: 'object', description: '元数据' },
      ],
    } satisfies VideoModelSpec,

    wanx26: {
      id: 'alibaba_wanx26_i2v',
      name: 'Alibaba Wanx2.6 I2V',
      description: 'Alibaba Wanx2.6 I2V 图生视频生成接口，支持将图片转换为视频，支持多种分辨率和时长选项，支持音频能力：支持自动配音，或传入自定义音频文件。',
      method: 'POST',
      path: '/api/v1/alibaba/alibaba_wanx26_i2v/generate',
      mockUrl: 'https://yapi.internal.ops.haiyiai.tech/mock/115/api/v1/alibaba/alibaba_wanx26_i2v/generate',
      apiDocUrl: 'https://help.aliyun.com/zh/model-studio/image-to-video-api-reference',
      params: [
        {
          name: 'input', type: 'object', required: true, description: '输入的基本信息，如提示词等',
          nested: [
            { name: 'prompt', type: 'string', required: false, description: '文本提示词。长度限制因模型版本而异：wan2.6-i2v: 不超过1500个字符。当使用视频特效参数（即template不为空）时，prompt参数无效，无需填写。', maxLength: 2000 },
            { name: 'img_url', type: 'string', required: true, description: '首帧图像的URL或 Base64 编码数据。图像格式: JPEG、JPG、PNG（不支持透明通道）、BMP、WEBP。图像分辨率: 宽度和高度范围为[360, 2000]，文件大小: 不超过10MB。' },
            { name: 'audio_url', type: 'string', required: false, description: '音频文件URL。格式: wav、mp3。时长: 3~30s。文件大小: 不超过15MB。' },
          ],
        } as Wanx26Param,
        {
          name: 'parameters', type: 'object', required: false, description: '生成参数',
          nested: [
            { name: 'resolution', type: 'string', required: false, default: '1080P', description: '指定视频分辨率档位。可选值: 720P、1080P。', enum: ['720P', '1080P'] },
            { name: 'duration', type: 'integer', required: false, default: '5', description: '生成视频的时长，单位为秒。wan2.6-i2v: 取值为[2, 15]之间的整数。', enum: ['5', '10', '15'] },
            { name: 'prompt_extend', type: 'boolean', required: false, default: 'true', description: '是否开启prompt智能改写。对于较短的prompt生成效果提升明显，但会增加耗时。' },
            { name: 'watermark', type: 'boolean', required: false, default: 'false', description: '是否添加水印标识。水印位于视频右下角，文案固定为"AI生成"。' },
            { name: 'audio', type: 'boolean', required: false, default: 'true', description: '是否生成有声视频。参数优先级: audio > audio_url。当audio=false时，即使传入audio_url，输出仍为无声视频。' },
            { name: 'shot_type', type: 'string', required: false, description: '指定生成视频的镜头类型。仅当"prompt_extend": true时生效。可选值: single(单镜头)、multi(多镜头)。', enum: ['single', 'multi'] },
            { name: 'negative_prompt', type: 'string', required: false, description: '反向提示词，描述不希望出现的内容' },
            { name: 'seed', type: 'integer', required: false, description: '随机数种子，取值范围为[0, 2147483647]。未指定时系统自动生成。' },
          ],
        } as Wanx26Param,
      ],
      responseFields: [
        { name: 'error', type: 'object', description: '错误信息' },
        { name: 'error.code', type: 'string', description: '错误码：001027095(内部生成错误)、001027096(结果解析异常)、001027097(HTTP错误响应)、001027098(状态检查异常)、001027099(任务创建异常)' },
        { name: 'error.message', type: 'string', description: '错误详细消息' },
        { name: 'usage', type: 'object', description: '使用统计信息' },
        { name: 'output.status', type: 'string', description: '任务状态：in_queue(队列中)、processing(处理中)、done(成功)、failed(失败)' },
        { name: 'output.content[].type', type: 'string', description: '资源类型' },
        { name: 'output.content[].url', type: 'string', description: '处理后的视频URL（CDN地址）' },
        { name: 'output.content[].jobId', type: 'string', description: '远程任务ID' },
        { name: 'output.metadata', type: 'object', description: '元数据' },
      ],
    } satisfies VideoModelSpec,
  },

  defaults: {
    apiKey: 'sa-WvAkejBEsAt86s7ARgV6CaB7i5RShK9njIMQWS00SXw',
    projectCode: 'SeaLuca',
    activeLlmEndpoint: 'dev' as EndpointEnv,
    activeMultimodalEndpoint: 'dev' as EndpointEnv,
    geminiModels: {
      'gemini-2.5-flash': true,
      'gemini-2.5-pro': true,
      'gemini-3-flash-preview': true,
      'gemini-3-pro-preview': true,
      'gemini-3.1-pro-preview': true,
    },
  } satisfies InternalApiSettings,
} as const
