FROM node:14
# Create app directory
WORKDIR /app
# Kopieren der package.json und package-lock.json in das Arbeitsverzeichnis /usr/src/app
COPY package*.json ./
# Install app dependencies
RUN npm install 
# Copy app code source from our local folder into docker /app working directory
COPY . .
# envirementVariable
ENV PORT=8080
# Install app on a given port
EXPOSE 8080
# start app
CMD ["npm", "start"]

