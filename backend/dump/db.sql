CREATE DATABASE  IF NOT EXISTS `workshop-aws` /*!40100 DEFAULT CHARACTER SET utf8 */;
USE `workshop-aws`;
-- MySQL dump 10.13  Distrib 8.0.17, for macos10.14 (x86_64)
--
-- Host: localhost    Database: workshop-aws
-- ------------------------------------------------------
-- Server version	8.0.14

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Posts`
--

DROP TABLE IF EXISTS `Posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `slug` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `text` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `UserId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `posts_slug` (`slug`),
  KEY `UserId` (`UserId`),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`UserId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Posts`
--

LOCK TABLES `Posts` WRITE;
/*!40000 ALTER TABLE `Posts` DISABLE KEYS */;
INSERT INTO `Posts` VALUES (13,'otro-posst-molon','https://e00-us-marca.uecdn.es/claro/assets/multimedia/imagenes/2020/08/03/15964681037000.jpg','Otro posst molón','descripción','El <b>html</b> molón cambiado','2020-08-06 15:37:33','2020-08-13 08:28:25',4),(14,'bbva-no-aplicara-comision','https://static1.hoy.es/www/multimedia/202003/23/media/cortadas/BBVA-RAce15zBlmQ3Iil5t8g7NzO-624x385@Hoy.jpg','BBVA no aplicará comisión','BBVA no aplicará comisión a los pensionistas que retiren la pensión desde un cajero de cualquier entidad de España','<h1 style=\"box-sizing: border-box; font-variant-numeric: normal; font-variant-east-asian: normal; font-weight: normal; font-stretch: normal; font-size: 2.35em; line-height: 45.9425px; font-family: &quot;Guardian Sans Semibold&quot;, sans-serif; margin-bottom: 32px; color: rgb(0, 0, 0);\">BBVA no aplicará comisión a los pensionistas que retiren la pensión desde un cajero de cualquier entidad de España</h1><div><p style=\"box-sizing: border-box; color: rgb(0, 0, 0); font-variant-numeric: normal; font-variant-east-asian: normal; font-stretch: normal; font-size: 18px; line-height: 28.8px; font-family: &quot;IBM Plex Serif&quot;, serif;\">BBVA contactará con todos sus clientes pensionistas para informales sobre el ingreso de su pensión. Recibirán en sus cuentas el abono como hasta ahora, pero BBVA les aconseja, atendiendo a las recomendaciones de las autoridades sanitarias, no salir de casa. No obstante, en caso de que necesiten retirar efectivo podrán hacerlo en el cajero más próximo a su domicilio de cualquier red de España,<span style=\"box-sizing: border-box; font-variant-numeric: normal; font-variant-east-asian: normal; font-weight: 700; font-stretch: normal; line-height: 28px;\">&nbsp;sin que BBVA les repercuta comisión del 25 de marzo al 5 de abril</span>. Además, el banco les ofrecerá toda la información sobre las oficinas abiertas de BBVA a las que pueden acudir si lo desean y los protocolos de seguridad necesarios para ello.</p><p style=\"box-sizing: border-box; color: rgb(0, 0, 0); font-variant-numeric: normal; font-variant-east-asian: normal; font-stretch: normal; font-size: 18px; line-height: 28.8px; font-family: &quot;IBM Plex Serif&quot;, serif;\">BBVA comunicará a los clientes que recibirán el ingreso de su pensión como cada mes y que podrán hacer uso de ella. Sin embargo, pensando en su salud, les recomienda evitar desplazamientos a las oficinas, principalmente a final de mes, cuando las sucursales pueden registrar alguna afluencia mayor de público. Además, les comunicará que si necesitan retirar efectivo pueden hacerlo en cualquier cajero nacional de cualquier red en toda España ya que BBVA asumirá las comisiones por retirada de efectivo a débito y por lo tanto el pensionista no tendrá comisión alguna por esta operación.</p><div id=\"_wmass_124837500002468\" w-type=\"outstream\" style=\"box-sizing: border-box; color: rgb(51, 51, 51); font-family: &quot;Helvetica Neue&quot;, Helvetica, Arial, sans-serif; font-size: 17px; position: relative;\"><div id=\"jw-0246802468\" style=\"box-sizing: border-box;\"></div></div><h3 style=\"box-sizing: border-box; font-variant-numeric: normal; font-variant-east-asian: normal; font-weight: normal; font-stretch: normal; font-size: 20px; line-height: normal; font-family: &quot;Guardian Sans Semibold&quot;, sans-serif; color: rgb(0, 0, 0); margin-top: 8px; margin-bottom: 8px; letter-spacing: 0.02px;\">Evitar desplazamientos ante el Covid-19</h3><p style=\"box-sizing: border-box; color: rgb(0, 0, 0); font-variant-numeric: normal; font-variant-east-asian: normal; font-stretch: normal; font-size: 18px; line-height: 28.8px; font-family: &quot;IBM Plex Serif&quot;, serif;\">En su comunicación, BBVA aconsejará a los clientes realizar sus pagos prioritariamente con tarjeta o por transferencia si disponen de libreta. En caso de necesitar disponer de efectivo, BBVA pondrá a su disposición toda la información sobre las oficinas abiertas más cercanas a sus domicilios, así cómo las precauciones de seguridad a tener en cuenta, entre ellas, respetar las distancias de seguridad.</p><p style=\"box-sizing: border-box; color: rgb(0, 0, 0); font-variant-numeric: normal; font-variant-east-asian: normal; font-stretch: normal; font-size: 18px; line-height: 28.8px; font-family: &quot;IBM Plex Serif&quot;, serif;\">Es probable que muchos de los mayores tengan la costumbre de acudir a la oficina a disponer de efectivo, pero las circunstancias actuales han obligado a modificar muchas de las costumbres ante la limitación de desplazamientos que impone el estado de alarma. Disponer de efectivo puede ser uno de esos hábitos que, en estos momentos, BBVA aconseja aplazar, en la medida de lo posible, por motivos de seguridad.</p></div><figure class=\"voc-main-figure \" style=\"box-sizing: border-box; margin-bottom: 16px; color: rgb(51, 51, 51); font-family: &quot;Helvetica Neue&quot;, Helvetica, Arial, sans-serif; font-size: 17px;\"></figure>','2020-08-06 16:05:34','2020-08-06 16:27:29',4),(15,'hala-madrid','https://fotos01.estadiodeportivo.com/2020/06/18/690x278/asensio-madrid-valencia.jpg','Hala Madrid','El mejor club del Mundo','El Madrid mola mucho','2020-08-06 16:28:20','2020-08-06 21:29:28',4),(16,'otro-post-mas','https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQ7JMAKXoeXBt1aq4O9wEWvQNshaSy_h2Mtjw&usqp=CAU','Otro post más','Probando vuelta','Gol de Mariano','2020-08-06 16:30:23','2020-08-06 16:30:23',4),(19,'gol','https://album.mediaset.es/eimg/2019/10/03/LlrwMNortXWvYAGYSa31J4.jpg','Gol','Golazo','Golazo','2020-08-06 16:33:01','2020-08-06 16:33:01',4);
/*!40000 ALTER TABLE `Posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PostTags`
--

DROP TABLE IF EXISTS `PostTags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PostTags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `PostId` int(11) DEFAULT NULL,
  `TagId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `post_tags__post_id__tag_id` (`PostId`,`TagId`),
  KEY `TagId` (`TagId`),
  CONSTRAINT `posttags_ibfk_7` FOREIGN KEY (`PostId`) REFERENCES `posts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `posttags_ibfk_8` FOREIGN KEY (`TagId`) REFERENCES `tags` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PostTags`
--

LOCK TABLES `PostTags` WRITE;
/*!40000 ALTER TABLE `PostTags` DISABLE KEYS */;
INSERT INTO `PostTags` VALUES (13,'2020-08-13 08:50:51','2020-08-13 08:50:51',13,9),(14,'2020-08-13 08:50:51','2020-08-13 08:50:51',13,10),(15,'2020-08-13 08:51:59','2020-08-13 08:51:59',13,11),(16,'2020-08-13 08:52:19','2020-08-13 08:52:19',15,9),(17,'2020-08-13 08:52:19','2020-08-13 08:52:19',15,10),(18,'2020-08-13 08:52:19','2020-08-13 08:52:19',15,12),(19,'2020-08-13 08:54:19','2020-08-13 08:54:19',13,13);
/*!40000 ALTER TABLE `PostTags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Tags`
--

DROP TABLE IF EXISTS `Tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tags_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Tags`
--

LOCK TABLES `Tags` WRITE;
/*!40000 ALTER TABLE `Tags` DISABLE KEYS */;
INSERT INTO `Tags` VALUES (9,'fútbol','2020-08-13 08:50:51','2020-08-13 08:50:51'),(10,'real madrid','2020-08-13 08:50:51','2020-08-13 08:50:51'),(11,'sergio ramos','2020-08-13 08:51:59','2020-08-13 08:51:59'),(12,'marco asensio','2020-08-13 08:52:19','2020-08-13 08:52:19'),(13,'defensa','2020-08-13 08:54:19','2020-08-13 08:54:19');
/*!40000 ALTER TABLE `Tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `surname` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Users`
--

LOCK TABLES `Users` WRITE;
/*!40000 ALTER TABLE `Users` DISABLE KEYS */;
INSERT INTO `Users` VALUES (4,'prueba@bbva.com','Fernando','Python','$2b$10$aaX18dGui3tT0QHnxauhue0UuxTMyuDY1MtRcdQwbEu9X/CPopdru','2020-08-13 08:19:49','2020-08-13 08:19:49');
/*!40000 ALTER TABLE `Users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2020-08-13 11:00:44
