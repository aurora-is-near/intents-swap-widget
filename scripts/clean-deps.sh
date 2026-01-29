#!/bin/bash

rm -rf node_modules

rm -rf packages/intents-swap-widget/dist
rm -rf apps/widget-creator/dist
rm -rf apps/ton-memelandia/dist
rm -rf apps/demo/dist

rm -rf .turbo
rm -rf apps/widget-creator/.turbo
rm -rf apps/ton-memelandia/.turbo
rm -rf apps/demo/.turbo

rm -rf apps/widget-creator/node_modules
rm -rf apps/ton-memelandia/node_modules
rm -rf apps/demo/node_modules

# Clean cache (run manually if needed since it's global)
# yarn cache clean --all
