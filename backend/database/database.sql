/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

USE `tcpl_taskblitz`;

/*Table structure for table `assignhistory` */

DROP TABLE IF EXISTS `AssignHistory`;

CREATE TABLE `AssignHistory` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'AssignHistory',
  `sprint` int(11) DEFAULT NULL COMMENT 'Sprint',
  `backlog` int(11) DEFAULT NULL,
  `assignTo` int(11) DEFAULT NULL COMMENT 'User',
  `assignAt` date DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `backlogs` */

DROP TABLE IF EXISTS `Backlogs`;

CREATE TABLE `Backlogs` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Backlog',
  `project` int(11) DEFAULT NULL,
  `parentTask` int(11) DEFAULT NULL,
  `position` int(5) DEFAULT NULL,
  `title` varchar(100) DEFAULT NULL,
  `summary` longtext DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `component` varchar(50) DEFAULT NULL,
  `status` int(2) DEFAULT 0,
  `issueType` int(2) DEFAULT NULL,
  `currentSprint` int(11) DEFAULT NULL COMMENT 'Sprint',
  `assignTo` int(11) DEFAULT NULL COMMENT 'User',
  `assignAt` datetime DEFAULT NULL,
  `startAt` date DEFAULT NULL,
  `endAt` date DEFAULT NULL,
  `remarks` longtext DEFAULT NULL,
  `tags` longtext DEFAULT NULL,
  `taskSize` int(11) DEFAULT NULL COMMENT 'TaskSize',
  `priority` int(1) DEFAULT 0,
  `votes` longtext DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `companies` */

DROP TABLE IF EXISTS `Companies`;

CREATE TABLE `Companies` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Company',
  `title` varchar(100) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `status` int(2) DEFAULT 0,
  `address` varchar(255) DEFAULT NULL,
  `employees` int(10) DEFAULT 10,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `projects` */

DROP TABLE IF EXISTS `Projects`;

CREATE TABLE `Projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Project',
  `company` int(11) DEFAULT NULL COMMENT 'Company',
  `title` varchar(100) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `status` int(2) DEFAULT 0,
  `startAt` date DEFAULT NULL,
  `endAt` date DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `projectteams` */

DROP TABLE IF EXISTS `ProjectTeams`;

CREATE TABLE `ProjectTeams` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ProjectTeam',
  `project` int(11) DEFAULT NULL COMMENT 'Project',
  `member` int(11) DEFAULT NULL COMMENT 'User',
  `role` int(1) DEFAULT NULL,
  `startFrom` date DEFAULT NULL,
  `endAt` date DEFAULT NULL,
  `status` int(1) DEFAULT 1,
  `token` varchar(100) DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `sprints` */

DROP TABLE IF EXISTS `Sprints`;

CREATE TABLE `Sprints` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Sprint',
  `project` int(11) DEFAULT NULL,
  `title` varchar(100) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `status` int(2) DEFAULT 0,
  `startAt` date DEFAULT NULL,
  `endAt` date DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `taskattachments` */

DROP TABLE IF EXISTS `TaskAttachments`;

CREATE TABLE `TaskAttachments` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'TaskComment',
  `sprint` int(11) DEFAULT NULL COMMENT 'Sprint',
  `backlog` int(11) DEFAULT NULL COMMENT 'Backlog',
  `attachmentPath` varchar(100) DEFAULT NULL,
  `comment` longtext DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `taskcomments` */

DROP TABLE IF EXISTS `TaskComments`;

CREATE TABLE `TaskComments` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'TaskComment',
  `sprint` int(11) DEFAULT NULL COMMENT 'Sprint',
  `backlog` int(11) DEFAULT NULL COMMENT 'Backlog',
  `comment` longtext DEFAULT NULL,
  `commentType` int(2) DEFAULT 1,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `tasksizes` */

DROP TABLE IF EXISTS `TaskSizes`;

CREATE TABLE `TaskSizes` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'TaskSize',
  `title` varchar(100) DEFAULT NULL,
  `code` varchar(10) DEFAULT NULL,
  `status` int(2) DEFAULT 0,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `taskstatusmaps` */

DROP TABLE IF EXISTS `TaskStatusMaps`;

CREATE TABLE `TaskStatusMaps` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'TaskStatusMap',
  `company` int(11) DEFAULT NULL COMMENT 'Company',
  `title` varchar(100) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `status` int(2) DEFAULT 0,
  `alloedStatus` longtext DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `users` */

DROP TABLE IF EXISTS `Users`;

CREATE TABLE `Users` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Employee',
  `emailId` varchar(255) DEFAULT NULL,
  `employeeId` varchar(10) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `firstName` varchar(255) DEFAULT NULL,
  `lastName` varchar(255) DEFAULT NULL,
  `fullName` varchar(120) DEFAULT NULL,
  `mobile` varchar(255) DEFAULT NULL,
  `alternateEmailId` varchar(255) DEFAULT NULL,
  `alternateMobile` varchar(255) DEFAULT NULL,
  `salt` varchar(255) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT NULL,
  `passwordChangeRequired` tinyint(1) DEFAULT NULL,
  `resetPasswordToken` varchar(255) DEFAULT NULL,
  `resetPasswordExpires` datetime DEFAULT NULL,
  `gender` int(1) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `profilePic` varchar(80) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `isDisabled` tinyint(1) DEFAULT NULL,
  `isLocked` int(11) DEFAULT 0,
  `createdBy` int(11) DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `loginAttempts` int(11) DEFAULT 0,
  `lastLoginAt` datetime DEFAULT NULL,
  `loginSessionId` varchar(100) DEFAULT NULL,
  `loginOTP` int(11) DEFAULT NULL,
  `otpValidTill` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


CREATE TABLE `TaskLogs` (
   `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'TaskLog',
   `backlog` int(11) DEFAULT NULL COMMENT 'Backlog',
   `param` varchar(30) DEFAULT NULL,
   `oldValue` longtext DEFAULT NULL,
   `newValue` longtext DEFAULT NULL,
   `createdBy` int(11) DEFAULT NULL,
   `createdAt` datetime DEFAULT NULL,
   `updatedBy` int(11) DEFAULT NULL,
   `updatedAt` datetime DEFAULT NULL,
   PRIMARY KEY (`id`)
 ) ENGINE=InnoDB;

CREATE TABLE `Invoices` (
   `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Invoices',
   `invoiceNumber` varchar(30) DEFAULT NULL,
   `invoiceRefNumber` varchar(30) DEFAULT NULL,
   `invoiceDoc` longtext DEFAULT NULL,
   `paidAmount` int(11) DEFAULT NULL,
   `billingAt` datetime DEFAULT NULL,
   `quantity` int(11) DEFAULT NULL,
   `invoiceType` int(2) DEFAULT NULL,
   `clearanceAt` datetime DEFAULT NULL,
   `billingFrom` longtext DEFAULT NULL,
   `status` int(2) DEFAULT NULL,
   `deliveryDate` datetime DEFAULT NULL,
   `deliveryType` int(3) DEFAULT NULL,
   `createdBy` int(11) DEFAULT NULL,
   `createdAt` datetime DEFAULT NULL,
   `updatedBy` int(11) DEFAULT NULL,
   `updatedAt` datetime DEFAULT NULL,
   PRIMARY KEY (`id`)
 ) ENGINE=InnoDB;


CREATE TABLE `Assets` (
   `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Assets',
   `assetNumber` varchar(30) DEFAULT NULL,
   `modelNumber` varchar(30) DEFAULT NULL,
   `serialNumber` varchar(30) DEFAULT NULL,
   `status` int(2) DEFAULT NULL,
   `assetType` int(2) DEFAULT NULL,
   `ownerType` int(2) DEFAULT NULL,
   `specifications` longtext DEFAULT NULL,
   `branch` int(11) DEFAULT NULL,
   `warrentyAt` datetime DEFAULT NULL,
   `assetphoto` longtext DEFAULT NULL,
   `lebelPhoto` longtext DEFAULT NULL,
   `returnedAt` datetime DEFAULT NULL,
   `createdBy` int(11) DEFAULT NULL,
   `createdAt` datetime DEFAULT NULL,
   `updatedBy` int(11) DEFAULT NULL,
   `updatedAt` datetime DEFAULT NULL,
   PRIMARY KEY (`id`)
 ) ENGINE=InnoDB;


CREATE TABLE `AssetDocuments` (
   `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'AssetDocuments',
   `assetId` int(11) DEFAULT NULL,
   `maintainanceId` int(11) DEFAULT NULL,
   `description` longtext DEFAULT NULL,
   `s3Path` longtext DEFAULT NULL,
   `createdBy` int(11) DEFAULT NULL,
   `createdAt` datetime DEFAULT NULL,
   `updatedBy` int(11) DEFAULT NULL,
   `updatedAt` datetime DEFAULT NULL,
   PRIMARY KEY (`id`)
 ) ENGINE=InnoDB;


 CREATE TABLE `MaintainanceLogs` (
   `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'MaintainanceLogs',
   `assetId` int(11) DEFAULT NULL,
   `issueType` int(11) DEFAULT NULL,
   `issueComment` longtext DEFAULT NULL,
   `assetOwner` int(11) DEFAULT NULL,
   `reportTo` int(11) DEFAULT NULL,
   `isHistory` int(2) DEFAULT NULL,
   `maintainanceStatus` int(2) DEFAULT NULL,
   `createdBy` int(11) DEFAULT NULL,
   `createdAt` datetime DEFAULT NULL,
   `updatedBy` int(11) DEFAULT NULL,
   `updatedAt` datetime DEFAULT NULL,
   PRIMARY KEY (`id`)
 ) ENGINE=InnoDB;
 

CREATE TABLE `AssetAssigns` (
   `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'AssetAssigns',
   `assetId` int(11) DEFAULT NULL,
   `isHistory` int(2) DEFAULT NULL,
   `assignedTo` int(11) DEFAULT NULL,
   `assignedBy` int(11) DEFAULT NULL,
   `assignedAt` datetime DEFAULT NULL,
   `assignStatus` int(2) DEFAULT NULL,
   `createdBy` int(11) DEFAULT NULL,
   `createdAt` datetime DEFAULT NULL,
   `updatedBy` int(11) DEFAULT NULL,
   `updatedAt` datetime DEFAULT NULL,
   PRIMARY KEY (`id`)
 ) ENGINE=InnoDB;

CREATE TABLE `AssetInventories` (
   `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'AssetInventories',
   `assetId` int(11) DEFAULT NULL,
   `invoiceId` int(11) DEFAULT NULL,
   `invoiceType` int(11) DEFAULT NULL,
   `createdBy` int(11) DEFAULT NULL,
   `createdAt` datetime DEFAULT NULL,
   `updatedBy` int(11) DEFAULT NULL,
   `updatedAt` datetime DEFAULT NULL,
   PRIMARY KEY (`id`)
 ) ENGINE=InnoDB;

 ALTER TABLE `AssetAssigns` ADD COLUMN `assignSubStatus` int(2) NULL;




 ALTER TABLE `Projects`     ADD COLUMN `departments` LONGTEXT NULL AFTER `endAt`;
 ALTER TABLE `Backlogs`     ADD COLUMN `department` VARCHAR(50) NULL AFTER `description`;