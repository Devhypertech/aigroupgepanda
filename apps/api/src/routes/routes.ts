/**
 * Dev Routes Endpoint
 * GET /api/routes - Lists all registered Express routes (dev only)
 */

import { Router } from 'express';

const router = Router();

/**
 * Extract all routes from Express app
 * Loosely typed to avoid Express generic mismatches.
 */
function getAllRoutes(app: any): Array<{ method: string; path: string }> {
  const routes: Array<{ method: string; path: string }> = [];

  // Recursively extract routes from Express router stack
  function extractRoutes(layer: any, basePath: string = '') {
    if (!layer) return;

    // Handle route layer
    if (layer.route) {
      const path = basePath + layer.route.path;
      const methods = Object.keys(layer.route.methods).filter(
        (method) => layer.route.methods[method]
      );
      methods.forEach((method) => {
        routes.push({
          method: method.toUpperCase(),
          path: path || '/',
        });
      });
    }
    // Handle router layer (nested routes)
    else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      const routerPath = basePath + (layer.regexp.source
        .replace('\\/?', '')
        .replace('(?=\\/|$)', '')
        .replace(/\\\//g, '/')
        .replace(/\^/g, '')
        .replace(/\$/g, '')
        .replace(/\\/g, '') || '');

      layer.handle.stack.forEach((nestedLayer: any) => {
        extractRoutes(nestedLayer, routerPath);
      });
    }
  }

  // Extract routes from app stack
  if (app._router && app._router.stack) {
    app._router.stack.forEach((layer: any) => {
      extractRoutes(layer);
    });
  }

  return routes;
}

/**
 * GET /api/routes
 * List all registered routes (dev only)
 */
router.get('/', (req, res) => {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'This endpoint is only available in development mode',
    });
  }

  try {
    // Get the Express app from the request
    const app = req.app;

    // Extract all routes
    const routes = getAllRoutes(app);

    // Sort routes by path, then by method
    routes.sort((a, b) => {
      if (a.path !== b.path) {
        return a.path.localeCompare(b.path);
      }
      return a.method.localeCompare(b.method);
    });

    // Group routes by path
    const groupedRoutes: Record<string, string[]> = {};
    routes.forEach((route) => {
      if (!groupedRoutes[route.path]) {
        groupedRoutes[route.path] = [];
      }
      groupedRoutes[route.path].push(route.method);
    });

    // Format response
    const formattedRoutes = Object.entries(groupedRoutes).map(([path, methods]) => ({
      path,
      methods: methods.sort(),
    }));

    res.json({
      ok: true,
      count: routes.length,
      routes: formattedRoutes,
      raw: routes, // Also include raw format for debugging
    });
  } catch (error) {
    console.error('[Routes] Error listing routes:', error);
    res.status(500).json({
      error: 'Failed to list routes',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

