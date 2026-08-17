-- =========================================================================
-- Enterprise Performance Tracker - Microsoft SQL Server Database Schema (company_db)
-- =========================================================================

-- 1. Create Database company_db (Execute in master)
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'company_db')
BEGIN
    CREATE DATABASE company_db;
END
GO

USE company_db;
GO

-- 2. Create Table intern_performance
IF OBJECT_ID('dbo.intern_performance', 'U') IS NOT NULL
    DROP TABLE dbo.intern_performance;
GO

CREATE TABLE dbo.intern_performance (
    s_no INT IDENTITY(1,1) PRIMARY KEY,
    intern_name NVARCHAR(255) NOT NULL,
    branch NVARCHAR(255),
    physical_visits INT DEFAULT 0,
    telecalling INT DEFAULT 0,
    dsa_connectors INT DEFAULT 0,
    promoters_builders INT DEFAULT 0,
    weekly_visits INT DEFAULT 0,
    leads_achieved INT DEFAULT 0,
    marketing_activity INT DEFAULT 0,
    insight NVARCHAR(MAX)
);
GO

-- 3. Populate Table with Pre-existing Data
SET IDENTITY_INSERT dbo.intern_performance ON;
GO

INSERT INTO dbo.intern_performance (s_no, intern_name, branch, physical_visits, telecalling, dsa_connectors, promoters_builders, weekly_visits, leads_achieved, marketing_activity, insight) VALUES
(1, N'Devadharshini M', N'Nungambakkam, Chennai', 1, 28, 0, 0, 1, 3, 0, N'Needs focus on physical visits.'),
(2, N'Kavya P', N'Nungambakkam, Chennai', 1, 28, 0, 0, 1, 2, 0, N'Consistent telecalling effort.'),
(3, N'Swetha S', N'Nungambakkam, Chennai', 1, 28, 0, 0, 1, 2, 0, N'Good steady performance.'),
(4, N'Sandhya S', N'Nungambakkam, Chennai', 1, 28, 0, 0, 1, 1, 0, N'Solid communication skills.'),
(5, N'Aadhithyan SV', N'West Zone - Mumbai', 40, 20, 20, 20, 40, 45, 10, N'High performing lead converter.'),
(6, N'Balaji N', N'West Zone - Mumbai', 35, 15, 15, 15, 35, 38, 8, N'Strong promoter network.'),
(7, N'Prasanth R', N'South Zone - Bengaluru', 42, 25, 25, 20, 42, 42, 12, N'Excellent weekly visit record.'),
(8, N'Rithik S', N'South Zone - Bengaluru', 30, 18, 12, 10, 30, 28, 5, N'Consistent lead pipeline.'),
(9, N'Santhosh K', N'North Zone - Delhi', 25, 30, 10, 8, 25, 22, 6, N'Very strong telecalling stats.'),
(10, N'Vishwa M', N'North Zone - Delhi', 20, 35, 8, 5, 20, 19, 4, N'High customer outreach.'),
(11, N'Dinesh Kumar', N'South Zone - Hyderabad', 38, 22, 18, 14, 38, 40, 9, N'Top performer in region.'),
(12, N'Gokul R', N'South Zone - Hyderabad', 28, 20, 14, 11, 28, 26, 7, N'Steady weekly improvement.');
GO

SET IDENTITY_INSERT dbo.intern_performance OFF;
GO

SELECT * FROM dbo.intern_performance;
GO
