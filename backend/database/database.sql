CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'mbmUsers',
  `emailId` varchar(255) DEFAULT NULL,
  `modeType` int(3) DEFAULT NULL,
  `planType` int(3) DEFAULT NULL,
  `firstName` varchar(255) DEFAULT NULL,
  `lastName` varchar(255) DEFAULT NULL,
  `fullName` varchar(48) DEFAULT NULL,
  `mobile` varchar(255) DEFAULT NULL,
  `alternateEmailId` varchar(255) DEFAULT NULL,
  `alternateMobile` varchar(255) DEFAULT NULL,
  `sub` varchar(255) DEFAULT NULL,
  `gender` int(11) DEFAULT 9,
  `dob` date DEFAULT NULL,
  `isTest` tinyint(1) DEFAULT NULL,
  `profilePic` varchar(80) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `isDisabled` tinyint(1) DEFAULT NULL,
  `isLocked` int(11) DEFAULT 0,
  `createdBy` int(11) DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=latin1;


CREATE TABLE `DataSets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dataSetNumber` varchar(255) DEFAULT NULL,
  `rowSchema` LONGTEXT DEFAULT NULL,
  `sourceFileName` LONGTEXT DEFAULT NULL,
  `rowCount` int(11) DEFAULT NULL,
  `rowExamples` LONGTEXT DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB
DEFAULT CHARSET=latin1;


CREATE TABLE `ActivityLogs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dataSetId` int(11) DEFAULT NULL,
  `conversationId` int(11) DEFAULT NULL,
  `prompt` LONGTEXT DEFAULT NULL,
  `promptType` int(11) DEFAULT NULL,
  `statusCode` varchar(255) DEFAULT NULL,
  `response` LONGTEXT DEFAULT NULL,
  `promptToken` float DEFAULT NULL,
  `completionToken` float DEFAULT NULL,
  `totalTokens` float DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB
DEFAULT CHARSET=latin1;


CREATE TABLE `Conversations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dataSetId` int(11) DEFAULT NULL,
  `type` int(11) DEFAULT NULL,
  `totalTokens` float DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB
DEFAULT CHARSET=latin1;

CREATE TABLE `TokenLimits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `loggedBy` int(11) DEFAULT NULL,
  `usedTokens` float DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `updatedBy` int(11) DEFAULT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB
DEFAULT CHARSET=latin1;
