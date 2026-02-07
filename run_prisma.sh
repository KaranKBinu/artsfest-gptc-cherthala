#!/bin/bash
npx prisma generate > prisma_log.txt 2>&1
echo "DONE" >> prisma_log.txt
