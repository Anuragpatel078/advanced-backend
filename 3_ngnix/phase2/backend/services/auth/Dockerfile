# FROM node

# WORKDIR /app

# COPY package.json package.json
# COPY package-lock.json package-lock.json 

# RUN npm install 
# COPY index.js index.js

# CMD ["node","index.js"]

FROM node

WORKDIR /app

COPY package*.json .
RUN npm install 
COPY . .

CMD ["node","index.js"]