
CREATE TABLE `Crawls` (
   `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Crawls',
   `pageURL` LONGTEXT DEFAULT NULL,
   `metaData` LONGTEXT DEFAULT NULL,
   `header` LONGTEXT DEFAULT NULL,
   `lastUpdatedAt` datetime DEFAULT NULL,
   `createdAt` datetime DEFAULT NULL,
   PRIMARY KEY (`id`)
 ) ENGINE=InnoDB;