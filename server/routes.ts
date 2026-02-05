import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, AVAILABLE_DEPENDENCIES } from "@shared/routes";
import { z } from "zod";
import JSZip from "jszip";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get(api.generator.stats.path, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.post(api.generator.create.path, async (req, res) => {
    try {
      const config = api.generator.create.input.parse(req.body);
      
      // Log the generation
      await storage.logProjectGeneration(config);

      // Generate the ZIP
      const zip = new JSZip();
      const root = `${config.artifactId}`;

      // 1. pom.xml
      zip.file(`${root}/pom.xml`, generatePom(config));

      // 2. Main Application Class
      const packagePath = config.packageName.replace(/\./g, "/");
      const mainClassName = toPascalCase(config.name) + "Application";
      zip.file(
        `${root}/src/main/java/${packagePath}/${mainClassName}.java`,
        generateMainClass(config.packageName, mainClassName)
      );

      // 3. application.properties
      zip.file(`${root}/src/main/resources/application.properties`, "spring.application.name=" + config.name);

      // 4. Test Class
      zip.file(
        `${root}/src/test/java/${packagePath}/${mainClassName}Tests.java`,
        generateTestClass(config.packageName, mainClassName)
      );

      // 5. Scaffolding (Optional Modules)
      if (config.scaffoldCrud) {
        addCrudScaffolding(zip, root, config.packageName, config.entityName || "Item");
      }
      
      if (config.scaffoldAuth) {
         addAuthScaffolding(zip, root, config.packageName);
      }

      if (config.seedData) {
        addSeedDataScaffolding(zip, root, config.packageName, config.entityName || "Item");
      }

      // Generate and send
      const content = await zip.generateAsync({ type: "nodebuffer" });
      
      res.set("Content-Type", "application/zip");
      res.set("Content-Disposition", `attachment; filename=${config.artifactId}.zip`);
      res.send(content);

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Generation error:", err);
      res.status(500).json({ message: "Failed to generate project" });
    }
  });

  return httpServer;
}

// === HELPERS ===

function toPascalCase(str: string) {
  return str.replace(/(^\w|-\w)/g, (m) => m.replace("-", "").toUpperCase());
}

function generatePom(config: any) {
  const dependenciesXml = config.dependencies.map((depId: string) => {
    const dep = AVAILABLE_DEPENDENCIES.find(d => d.id === depId);
    if (!dep) return "";
    
    let groupId = "org.springframework.boot";
    let artifactId = "";
    
    switch(depId) {
      case 'web': artifactId = "spring-boot-starter-web"; break;
      case 'data-jpa': artifactId = "spring-boot-starter-data-jpa"; break;
      case 'security': artifactId = "spring-boot-starter-security"; break;
      case 'thyme': artifactId = "spring-boot-starter-thymeleaf"; break;
      case 'devtools': artifactId = "spring-boot-devtools"; break;
      case 'lombok': 
        groupId = "org.projectlombok";
        artifactId = "lombok";
        break;
      case 'postgresql':
        groupId = "org.postgresql";
        artifactId = "postgresql";
        break;
      case 'h2':
        groupId = "com.h2database";
        artifactId = "h2";
        break;
      default: return "";
    }

    return `
        <dependency>
            <groupId>${groupId}</groupId>
            <artifactId>${artifactId}</artifactId>
            ${depId === 'lombok' ? '<optional>true</optional>' : ''}
            ${depId === 'h2' ? '<scope>runtime</scope>' : ''}
        </dependency>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>${config.bootVersion}</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>
    <groupId>${config.groupId}</groupId>
    <artifactId>${config.artifactId}</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>${config.name}</name>
    <description>${config.description}</description>
    <properties>
        <java.version>${config.javaVersion}</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        ${dependenciesXml}
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                ${config.dependencies.includes('lombok') ? `
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>` : ''}
            </plugin>
        </plugins>
    </build>

</project>`;
}

function generateMainClass(packageName: string, className: string) {
  return `package ${packageName};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${className} {

    public static void main(String[] args) {
        SpringApplication.run(${className}.class, args);
    }

}
`;
}

function generateTestClass(packageName: string, className: string) {
  return `package ${packageName};

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ${className}Tests {

    @Test
    void contextLoads() {
    }

}
`;
}

function addCrudScaffolding(zip: JSZip, root: string, packageName: string) {
    const packagePath = packageName.replace(/\./g, "/");
    
    // Entity
    zip.file(`${root}/src/main/java/${packagePath}/entity/Item.java`, `package ${packageName}.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Item {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
`);

    // Repository
    zip.file(`${root}/src/main/java/${packagePath}/repository/ItemRepository.java`, `package ${packageName}.repository;

import ${packageName}.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {
}
`);

    // Controller
    zip.file(`${root}/src/main/java/${packagePath}/controller/ItemController.java`, `package ${packageName}.controller;

import ${packageName}.entity.Item;
import ${packageName}.repository.ItemRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    private final ItemRepository repository;

    public ItemController(ItemRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Item> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Item create(@RequestBody Item item) {
        return repository.save(item);
    }
}
`);
}

function addAuthScaffolding(zip: JSZip, root: string, packageName: string) {
    const packagePath = packageName.replace(/\./g, "/");
    
    zip.file(`${root}/src/main/java/${packagePath}/config/SecurityConfig.java`, `package ${packageName}.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests((requests) -> requests
                .requestMatchers("/", "/home").permitAll()
                .anyRequest().authenticated()
            )
            .formLogin((form) -> form
                .permitAll()
            )
            .logout((logout) -> logout.permitAll());

        return http.build();
    }
}
`);
}
