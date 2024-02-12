# TerraClassifier_1

Welcome to Terra Classifier - your portal for supervised classification of remote sensing data!
Terra Classifier is a web application designed to revolutionize the classification of satellite data.

## Who we are: The team behind Terra Classifier: 
Our dedicated team of six qualified geoinformatics students are passionate about driving innovation.
We understand the importance of accurate environmental information and are proud to present you with Terra Classifier, a platform dedicated to this.

## Why Terra Classifier?
Speed and efficiency: Classify satellite images and training data directly in your web browser.
Ease of use: Our platform is intuitive and easy to use.

## Installing and launching the web application from this GitHub repository with Docker:
It is highly recommended to deploy the service on an AWS EC2 machine that is in us-west-2 region (Oregon) as that is the data centre where the Earth Observation(EO) datasets found in AWS STAC search are stored.
You must enable port 3000 and 8080 of the EC2 instance for provisioning and communication with the service.

1. Clone the following [GitHub repository](https://github.com/astru03/TerraClassifier_1) to an IDE (for example VS Code) or to your AWS EC2 instance.
2. Navigate to the TerraClassifier folder to the directory where the docker-compose.yml is located. On the AWS EC2 instance, this can be done with the following command: 
```bash
cd TerraClassifier_1
```
3. Assuming that Docker is installed and running on your system, execute the following command:
```bash
docker-compose up --build -d
```
4. An image of the application is created and the image of "openeocubes_custom" published on Dockerhub is used at the same time. Both images are started together in a container.
5. Once the container has been successfully downloaded and started, the application can be accessed in the browser.
If the application has been started locally, it can be accessed at the following URL: http://localhost:3000
If the application has been started via an AWS EC2 instance, it can be accessed at the following URL: http://IP-of-your-EC2-Instance:3000

Please use the Chrome or Edge browser to start the application.
Please be patient, as the application, especially when running locally, is very slow and depends on the utilization of openeo-API.
Depending on the area, a classification can take up to 10 minutes.

## Installing and starting the DockerHub web application:
You can get a hosted Docker image of openeocubes_custom via the Dockerhub platform. https://hub.docker.com/r/astru/openeocubes_custom
It is highly recommended to deploy the service on an AWS EC2 machine that is in us-west-2 region (Oregon) as that is the data centre where the Earth Observation(EO) datasets found in AWS STAC search are stored.
You must enable port 3000 and 8080 of the EC2 instance for provisioning and communication with the service.

First, the image must be pulled from Dockerhub with the command:
```bash
docker pull astru/openeocubes_customc
```
After pulling the image can be started with the command:
```bash
docker run -p -d 8080:8080  --env AWSHOST=54.185.59.127  astru/openeocubes_custom:latest
```

## Functionality of the web application:
### Home
After starting the web application, the start page appears under the "Home" tab.

### Model training and classification
The "Model training and classification" tab contains the main part of the web application for performing a supervised classification.

#### Sentinel-2
This button triggers the process of obtaining sentinel -2 images. Before you can press this button, you must first select an area in the leaflet map for which a sentinel -2 image should be loaded. In order to be able to use machine learning for classification, the program needs a sentinel-2 image that can be evaluated. You can draw the desired area using the "draw a rectangle" button on the left-hand edge of the map. Once you have clicked on the sentinel-2 button, you will be asked to select a date in the " time period from:" field. Based on the selected date, a period of exactly 1 month is taken into account and the corresponding sentinel-2 images are used for this period.
You can also enter a cloud cover in %. It goes without saying that a low cloud cover is best suited for drawing training-areas and performing a classification.
If you confirm your selection with "Ok", another pop-up window "make selection" appears. Here you can select the sentinel-2 images available for the selected area, time period and cloud cover. By pressing "Ok" the sentinel-2 image is now loaded.


#### Training data
Training datas are required for a successful classification. You can either upload this training data via "File upload" or create it right here in the web application. Please ensure that the training datas are only located within the previously selected "Area Of Training" (AOT).
If the "File upload" button is clicked, a pop-up window informs you that an AOT must first be available before you can continue with the upload function.
If you click on the "Draw your own training data" button, a pop-up window will first inform you of what you need to do.
You will be shown that at least nine training areas must be drawn. There must be at least three of each "ClassID" and " Label" and at least three different categories must be created. An example is also shown in the pop-up window.
If you confirm the pop-up window with "Ok", you can now define an AOT with "Draw Rectangle" and then draw the training datas with "Draw Polygon". 
With "File upload" of training datas, you have the option of uploading files in GeoJSON or GeoPackage format.
Important note: The format and structure of the data is validated. The type of training data may only be Polygon, Multipolygon, LineString or MulitLineStrings. The fields "ClassID" and "Label" are mandatory. Furthermore, it is necessary that a „ClassID“ must occur at least three times and there must be at least three different of it. The training polygons must be of the polygon or multipolygon type.

#### Algorithm
After clicking on this symbol, you can choose between four different algorithms. You can choose between the "Minimum Distance", "Random Forest", "Gradient Boosting Machine" and "Support Vector Machine" algorithms. You can only select one algorithm at a time. Confirm your selection with "OK".


#### AOI
Once you have clicked the button, the "Area Of Training" disappears. Now you can draw an "Area Of Interest" by clicking on "Draw a rectangle". This represents the area to be classified. The larger the area, the longer the calculation takes.

#### Resolution
You can use the "Resolution" function to determine the resolution in which the classification is to be carried out. The smaller the resolution, the longer the calculation takes. Please note that a resolution of 30x30, 60x60 and 100x100 should only be used for small "AOI's", otherwise the classification will take too long. For larger areas, a resolution of 200x200 and 500x500 has been added.

#### Classification
Click on this button to start the calculation for the monitored classification. A loading symbol appears, indicating that the calculation is being carried out. After successful completion, you will be asked in a pop-up window whether you want to download the classification as a GeoTiff. The result of the monitored classification for the AOI is then displayed on the map.

#### Download Model
Using the "Download Model" function, the user now has the option of downloading the trained model for the classification performed as rds.

#### Reload
The last function "reload" allows the user to reload the website and thus perform a new classification.

### Example
The "Example" tab provides a "one-click" demonstration of a supervised classification. After the "Start Demo" button is clicked, a supervised classification is carried out using predefined information. This includes: The "Area of Intest", "Area of Training", training data, start and end time, algorithm, and resolution.

### Documentation
In the "Documentation" tab, you will find detailed documentation on the functions that can be found under "Model training and classification".

### Imprint
The contact details can be found in the "Imprint" tab.

Licensing:
The license used is the GNU Affero General Public License version 3.<br>
https://opensource.org/license/agpl-v3/
