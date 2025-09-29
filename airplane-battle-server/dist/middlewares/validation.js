import Joi from 'joi';
import { logger } from '../utils/logger.js';
export const validate = (schema) => {
    return (req, res, next) => {
        try {
            const { error, value } = schema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true,
                convert: true
            });
            if (error) {
                const errors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context?.value
                }));
                logger.warn('请求验证失败:', { errors, body: req.body });
                res.status(400).json({
                    success: false,
                    message: '请求参数验证失败',
                    error: {
                        code: 'VALIDATION_ERROR',
                        details: errors
                    }
                });
                return;
            }
            req.body = value;
            next();
        }
        catch (validationError) {
            logger.error('验证中间件错误:', validationError);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    };
};
export const registerSchema = Joi.object({
    username: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .required()
        .messages({
        'string.alphanum': '用户名只能包含字母和数字',
        'string.min': '用户名至少3个字符',
        'string.max': '用户名最多30个字符',
        'any.required': '用户名是必填项'
    }),
    email: Joi.string()
        .email()
        .required()
        .messages({
        'string.email': '请输入有效的邮箱地址',
        'any.required': '邮箱是必填项'
    }),
    password: Joi.string()
        .min(6)
        .max(100)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
        .required()
        .messages({
        'string.min': '密码至少6个字符',
        'string.max': '密码最多100个字符',
        'string.pattern.base': '密码必须包含大小写字母和数字',
        'any.required': '密码是必填项'
    }),
    displayName: Joi.string()
        .min(1)
        .max(100)
        .optional()
        .messages({
        'string.min': '显示名称至少1个字符',
        'string.max': '显示名称最多100个字符'
    })
});
export const loginSchema = Joi.object({
    username: Joi.string()
        .required()
        .messages({
        'any.required': '用户名是必填项'
    }),
    password: Joi.string()
        .required()
        .messages({
        'any.required': '密码是必填项'
    })
});
export const createRoomSchema = Joi.object({
    roomName: Joi.string()
        .min(1)
        .max(100)
        .required()
        .messages({
        'string.min': '房间名称至少1个字符',
        'string.max': '房间名称最多100个字符',
        'any.required': '房间名称是必填项'
    }),
    roomType: Joi.string()
        .valid('public', 'private')
        .default('public')
        .messages({
        'any.only': '房间类型必须是public或private'
    }),
    password: Joi.string()
        .min(4)
        .max(50)
        .when('roomType', {
        is: 'private',
        then: Joi.required(),
        otherwise: Joi.forbidden()
    })
        .messages({
        'string.min': '房间密码至少4个字符',
        'string.max': '房间密码最多50个字符',
        'any.required': '私人房间必须设置密码',
        'any.unknown': '公开房间不能设置密码'
    })
});
export const joinRoomSchema = Joi.object({
    roomId: Joi.string()
        .uuid()
        .required()
        .messages({
        'string.uuid': '房间ID格式无效',
        'any.required': '房间ID是必填项'
    }),
    password: Joi.string()
        .min(4)
        .max(50)
        .optional()
        .messages({
        'string.min': '房间密码至少4个字符',
        'string.max': '房间密码最多50个字符'
    })
});
export const paginationSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
        'number.min': '页码必须大于0'
    }),
    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10)
        .messages({
        'number.min': '每页数量必须大于0',
        'number.max': '每页数量不能超过100'
    }),
    sortBy: Joi.string()
        .valid('created_at', 'updated_at', 'rating', 'username')
        .default('created_at')
        .messages({
        'any.only': '排序字段无效'
    }),
    sortOrder: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
        .messages({
        'any.only': '排序方向必须是asc或desc'
    })
});
//# sourceMappingURL=validation.js.map