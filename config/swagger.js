const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'City Admin Panel API',
      version: '1.0.0',
      description: 'API documentation for the City Admin Panel',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Admin: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              description: 'Admin username',
              example: 'admin',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Admin email',
              example: 'admin@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Admin password (min 6 characters)',
              example: 'Password123',
            },
          },
        },
        City: {
          type: 'object',
          required: ['name', 'description'],
          properties: {
            name: {
              type: 'string',
              description: 'Name of the city',
              example: 'New York',
            },
            description: {
              type: 'string',
              description: 'Description of the city',
              example: 'The most populous city in the United States',
            },
            location: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['Point'],
                  default: 'Point',
                },
                coordinates: {
                  type: 'array',
                  items: {
                    type: 'number',
                  },
                  example: [-74.0059, 40.7128],
                },
                formattedAddress: {
                  type: 'string',
                  example: 'New York, NY, USA',
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthorized - Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: 'Not authorized to access this route',
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './routes/*.js',
    './models/*.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
