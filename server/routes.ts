import type { Express } from "express";
import type { Server } from "http";
import { databaseMode, storage } from "./storage.js";
import { api, AVAILABLE_DEPENDENCIES } from "../shared/routes.js";
import { z } from "zod";
import JSZip from "jszip";

export function registerRoutes(httpServer: Server, app: Express): Server {

  app.get(api.generator.stats.path, async (req, res) => {
    const stats = await storage.getStats();
    res.json({
      ...stats,
      storageMode: databaseMode,
    });
  });

  app.post(api.generator.create.path, async (req, res) => {
    try {
      const config = api.generator.create.input.parse(req.body);
      
      // Ensure core Spring starters and always-on tools are always included.
      // Spring Security is *only* added when scaffoldAuth is true.
      const coreDeps = ["web", "data-jpa", "lombok", "devtools"];
      const depSet = new Set([...(config.dependencies ?? []), ...coreDeps]);

      if (config.scaffoldAuth) {
        depSet.add("security");
      } else {
        // Make sure security is NOT present when auth is disabled
        depSet.delete("security");
      }

      config.dependencies = Array.from(depSet);
      
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
      const usesPostgres = config.dependencies.includes("postgresql");
      const usesH2 = config.dependencies.includes("h2");
      const usesSecurity = config.dependencies.includes("security");

      let applicationProperties = `spring.application.name=${config.name}
`;

      if (usesPostgres) {
        applicationProperties += `
spring.datasource.url=jdbc:postgresql://localhost:5432/${config.artifactId}
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.hibernate.ddl-auto=update
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
`;
      } else if (usesH2) {
        applicationProperties += `
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.h2.console.enabled=true
spring.jpa.hibernate.ddl-auto=update
`;
      }

      // If security dependency is not present, force-disable Spring Security auto-config
      if (!usesSecurity) {
        applicationProperties += `
spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration,org.springframework.boot.actuate.autoconfigure.security.servlet.ManagementWebSecurityAutoConfiguration
`;
      }

      zip.file(
        `${root}/src/main/resources/application.properties`,
        applicationProperties
      );

      // 4. Test Class
      zip.file(
        `${root}/src/test/java/${packagePath}/${mainClassName}Tests.java`,
        generateTestClass(config.packageName, mainClassName)
      );

      // 5. Scaffolding (Optional Modules)
      // Prefer new multi-entity configuration if provided
      const entities: CrudEntityConfig[] =
        Array.isArray((config as any).entities) &&
        (config as any).entities.length > 0
          ? (config as any).entities
          : [
              {
                name: config.entityName || "Item",
                fields: [
                  {
                    name: "name",
                    type: "String",
                  },
                ],
              },
            ];

      if (config.scaffoldCrud) {
        for (const entity of entities) {
          addCrudScaffolding(zip, root, config.packageName, entity);
        }
      }
      
      if (config.scaffoldAuth) {
        addAuthScaffolding(zip, root, config.packageName);
      }

      // Always create DataInitializer when either seedData or auth is enabled
      if (config.seedData || config.scaffoldAuth) {
        addSeedDataScaffolding(
          zip,
          root,
          config.packageName,
          entities,
          config.scaffoldAuth
        );
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

type CrudFieldType =
  | "String"
  | "Long"
  | "Integer"
  | "Double"
  | "Boolean"
  | "LocalDate"
  | "LocalDateTime";

interface CrudEntityConfig {
  name: string;
  fields: { name: string; type: CrudFieldType }[];
}

function mapJavaType(type: CrudFieldType): string {
  switch (type) {
    case "String":
      return "String";
    case "Long":
      return "Long";
    case "Integer":
      return "Integer";
    case "Double":
      return "Double";
    case "Boolean":
      return "Boolean";
    case "LocalDate":
      return "LocalDate";
    case "LocalDateTime":
      return "LocalDateTime";
    default:
      return "String";
  }
}

function addCrudScaffolding(
  zip: JSZip,
  root: string,
  packageName: string,
  entity: CrudEntityConfig
) {
    const packagePath = packageName.replace(/\./g, "/");
  const pascalEntity = toPascalCase(entity.name);
  const camelEntity =
    entity.name.charAt(0).toLowerCase() + entity.name.slice(1);

  const uniqueFields =
    entity.fields && entity.fields.length > 0
      ? entity.fields
      : [{ name: "name", type: "String" as CrudFieldType }];

  const fieldsWithId: { name: string; type: CrudFieldType }[] = [
    { name: "id", type: "Long" },
    ...uniqueFields.filter((f) => f.name !== "id"),
  ];

  const needsLocalDateImport = fieldsWithId.some(
    (f) => f.type === "LocalDate"
  );
  const needsLocalDateTimeImport = fieldsWithId.some(
    (f) => f.type === "LocalDateTime"
  );

  const fieldLines = fieldsWithId
    .map((f) => {
      if (f.name === "id") {
        // Primary key field with JPA annotations
        return `    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;`;
      }
      return `    private ${mapJavaType(f.type)} ${f.name};`;
    })
    .join("\n");

  const getterSetterLines = fieldsWithId
    .map((f) => {
      const javaType = mapJavaType(f.type);
      const pascalField =
        f.name.charAt(0).toUpperCase() + f.name.slice(1);
      return `
    public ${javaType} get${pascalField}() { return ${f.name}; }
    public void set${pascalField}(${javaType} ${f.name}) { this.${f.name} = ${f.name}; }`;
    })
    .join("\n");
    
  // Entity
  zip.file(
    `${root}/src/main/java/${packagePath}/entity/${pascalEntity}.java`,
    `package ${packageName}.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
${needsLocalDateImport ? "import java.time.LocalDate;\n" : ""}${
      needsLocalDateTimeImport ? "import java.time.LocalDateTime;\n" : ""
    }
@Entity
public class ${pascalEntity} {
${fieldLines}
${getterSetterLines}
}
`
  );

    // Repository
    zip.file(`${root}/src/main/java/${packagePath}/repository/${pascalEntity}Repository.java`, `package ${packageName}.repository;

import ${packageName}.entity.${pascalEntity};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ${pascalEntity}Repository extends JpaRepository<${pascalEntity}, Long> {
}
`);

    // Service Interface
    zip.file(`${root}/src/main/java/${packagePath}/service/${pascalEntity}Service.java`, `package ${packageName}.service;

import ${packageName}.entity.${pascalEntity};
import java.util.List;
import java.util.Optional;

public interface ${pascalEntity}Service {
    List<${pascalEntity}> getAll();
    Optional<${pascalEntity}> getById(Long id);
    ${pascalEntity} create(${pascalEntity} ${camelEntity});
    ${pascalEntity} update(Long id, ${pascalEntity} ${camelEntity});
    void delete(Long id);
}
`);

    // Service Implementation
    zip.file(`${root}/src/main/java/${packagePath}/service/${pascalEntity}ServiceImpl.java`, `package ${packageName}.service;

import ${packageName}.entity.${pascalEntity};
import ${packageName}.repository.${pascalEntity}Repository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ${pascalEntity}ServiceImpl implements ${pascalEntity}Service {

    private final ${pascalEntity}Repository repository;

    @Autowired
    public ${pascalEntity}ServiceImpl(${pascalEntity}Repository repository) {
        this.repository = repository;
    }

    @Override
    public List<${pascalEntity}> getAll() {
        return repository.findAll();
    }

    @Override
    public Optional<${pascalEntity}> getById(Long id) {
        return repository.findById(id);
    }

    @Override
    public ${pascalEntity} create(${pascalEntity} ${camelEntity}) {
        return repository.save(${camelEntity});
    }

    @Override
    public ${pascalEntity} update(Long id, ${pascalEntity} ${camelEntity}) {
        return repository.findById(id)
                .map(existing -> {
                    ${camelEntity}.setId(id);
                    return repository.save(${camelEntity});
                })
                .orElseThrow(() -> new RuntimeException("${pascalEntity} not found with id: " + id));
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }
}
`);

    // Controller
    zip.file(`${root}/src/main/java/${packagePath}/controller/${pascalEntity}Controller.java`, `package ${packageName}.controller;

import ${packageName}.entity.${pascalEntity};
import ${packageName}.service.${pascalEntity}Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/${camelEntity}s")
public class ${pascalEntity}Controller {

    private final ${pascalEntity}Service service;

    @Autowired
    public ${pascalEntity}Controller(${pascalEntity}Service service) {
        this.service = service;
    }

    @GetMapping
    public List<${pascalEntity}> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<${pascalEntity}> getById(@PathVariable Long id) {
        Optional<${pascalEntity}> ${camelEntity} = service.getById(id);
        return ${camelEntity}.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<${pascalEntity}> create(@RequestBody ${pascalEntity} ${camelEntity}) {
        ${pascalEntity} created = service.create(${camelEntity});
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<${pascalEntity}> update(@PathVariable Long id, @RequestBody ${pascalEntity} ${camelEntity}) {
        try {
            ${pascalEntity} updated = service.update(id, ${camelEntity});
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
`);
}

function sampleValueForField(
  entityName: string,
  fieldName: string,
  type: CrudFieldType,
  index: number
): string {
  switch (type) {
    case "String":
      return `"Sample ${toPascalCase(entityName)} ${index} ${fieldName}"`;
    case "Long":
    case "Integer":
      return `${index}`;
    case "Double":
      return `${index}.0`;
    case "Boolean":
      return index % 2 === 0 ? "true" : "false";
    case "LocalDate":
      return "java.time.LocalDate.now()";
    case "LocalDateTime":
      return "java.time.LocalDateTime.now()";
    default:
      return `"Sample ${toPascalCase(entityName)} ${index} ${fieldName}"`;
  }
}

function addSeedDataScaffolding(
  zip: JSZip,
  root: string,
  packageName: string,
  entities: CrudEntityConfig[],
  includeAuthUser: boolean
) {
  const packagePath = packageName.replace(/\./g, "/");

  const pascalEntities = entities.map((e) => toPascalCase(e.name));
  const repoImportsParts = pascalEntities.map(
    (pe) =>
      `import ${packageName}.entity.${pe};\nimport ${packageName}.repository.${pe}Repository;`
  );

  const repoParamsParts = pascalEntities.map((pe) => {
    const camelRepo = pe.charAt(0).toLowerCase() + pe.slice(1) + "Repository";
    return `${pe}Repository ${camelRepo}`;
  });

  if (includeAuthUser) {
    repoImportsParts.push(
      `import ${packageName}.entity.User;\nimport ${packageName}.repository.UserRepository;`
    );
    repoParamsParts.push("UserRepository userRepository");
    // PasswordEncoder is only needed when auth is enabled
    repoImportsParts.push(
      "import org.springframework.security.crypto.password.PasswordEncoder;"
    );
    repoParamsParts.push("PasswordEncoder passwordEncoder");
  }

  const repoImports = repoImportsParts.join("\n");
  const repoParams = repoParamsParts.join(", ");

  const anyLocalDate = entities.some((e) =>
    e.fields.some((f) => f.type === "LocalDate")
  );
  const anyLocalDateTime = entities.some((e) =>
    e.fields.some((f) => f.type === "LocalDateTime")
  );

  const bodyLinesForEntities = entities
    .map((entity) => {
      const pascalEntity = toPascalCase(entity.name);
      const camelEntity =
        entity.name.charAt(0).toLowerCase() + entity.name.slice(1);
      const repoVar = camelEntity + "Repository";

      const nonIdFields =
        entity.fields && entity.fields.length > 0
          ? entity.fields.filter((f) => f.name !== "id")
          : [{ name: "name", type: "String" as CrudFieldType }];

      const createInstances = [1, 2]
        .map((idx) => {
          const varName = `${camelEntity}${idx}`;
          const fieldSets = nonIdFields
            .map(
              (f) =>
                `            ${varName}.set${
                  f.name.charAt(0).toUpperCase() + f.name.slice(1)
                }(${sampleValueForField(entity.name, f.name, f.type, idx)});`
            )
            .join("\n");

          return `            ${pascalEntity} ${varName} = new ${pascalEntity}();
${fieldSets}
`;
        })
        .join("\n");

      return `${createInstances}
            ${repoVar}.saveAll(java.util.List.of(${camelEntity}1, ${camelEntity}2));
`;
    })
    .join("\n");

  let bodyLines = bodyLinesForEntities;

  if (includeAuthUser) {
    bodyLines += `
            // Create superuser with ADMIN role
            if (userRepository.count() == 0) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("admin"));
                admin.setRole("ADMIN");
                userRepository.save(admin);
            }
`;
  }

  zip.file(
    `${root}/src/main/java/${packagePath}/config/DataInitializer.java`,
    `package ${packageName}.config;

${repoImports}
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
${anyLocalDate ? "import java.time.LocalDate;\n" : ""}${
      anyLocalDateTime ? "import java.time.LocalDateTime;\n" : ""
    }

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(${repoParams}) {
        return args -> {
${bodyLines}
            System.out.println("Preloading database with sample data...");
        };
    }
}
`
  );
}

function addAuthScaffolding(zip: JSZip, root: string, packageName: string) {
  const packagePath = packageName.replace(/\./g, "/");

  // === User entity ===
  zip.file(
    `${root}/src/main/java/${packagePath}/entity/User.java`,
    `package ${packageName}.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
`
  );

  // === User repository ===
  zip.file(
    `${root}/src/main/java/${packagePath}/repository/UserRepository.java`,
    `package ${packageName}.repository;

import ${packageName}.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
}
`
  );

  // === JWT Utility ===
  zip.file(
    `${root}/src/main/java/${packagePath}/security/JwtUtil.java`,
  `package ${packageName}.security;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public class JwtUtil {

    private static final String SECRET = "change-me-super-secret-key-change-me";
    private static final long EXPIRATION_MS = 1000 * 60 * 60; // 1 hour

    public static String generateToken(String username) {
        long nowMillis = System.currentTimeMillis();
        long expMillis = nowMillis + EXPIRATION_MS;

        String headerJson  = "{\\"alg\\":\\"HS256\\",\\"typ\\":\\"JWT\\"}";
        String payloadJson = "{\\"sub\\":\\"" + username + "\\",\\"iat\\":" 
                + (nowMillis / 1000)
                + ",\\"exp\\":" 
                + (expMillis / 1000) 
                + "}";

        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));

        String signature = sign(header + "." + payload);

        return header + "." + payload + "." + signature;
    }

    public static String extractUsername(String token) {
        try {
            String[] parts = token.split("\\\\.");
            if (parts.length != 3) {
                return null;
            }
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);

            String marker = "\\"sub\\":\\"";
            int start = payload.indexOf(marker);
            if (start == -1) return null;
            start += marker.length();
            int end = payload.indexOf("\\"", start);
            if (end == -1) return null;
            return payload.substring(start, end);
        } catch (Exception e) {
            return null;
        }
    }

    public static boolean isTokenExpired(String token) {
        try {
            String[] parts = token.split("\\\\.");
            if (parts.length != 3) {
                return true;
            }
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);

            String marker = "\\"exp\\":";
            int start = payload.indexOf(marker);
            if (start == -1) return true;
            start += marker.length();
            int end = payload.indexOf("}", start);
            if (end == -1) end = payload.length();

            long expSeconds = Long.parseLong(payload.substring(start, end));
            long nowSeconds = System.currentTimeMillis() / 1000;
            return nowSeconds > expSeconds;
        } catch (Exception e) {
            return true;
        }
    }

    private static String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            Key key = new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(key);
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        } catch (Exception e) {
            throw new RuntimeException("Failed to sign JWT", e);
        }
    }
}`
  );

  // === JWT Authentication Filter ===
  zip.file(
    `${root}/src/main/java/${packagePath}/security/JwtAuthenticationFilter.java`,
    `package ${packageName}.security;

import ${packageName}.entity.User;
import ${packageName}.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    public JwtAuthenticationFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            String username = JwtUtil.extractUsername(token);

            if (username != null && !JwtUtil.isTokenExpired(token)
                    && SecurityContextHolder.getContext().getAuthentication() == null) {

                User user = userRepository.findByUsername(username).orElse(null);
                if (user != null) {
                    UserDetails userDetails = org.springframework.security.core.userdetails.User
                            .withUsername(user.getUsername())
                            .password(user.getPassword())
                            .roles(user.getRole())
                            .build();

                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
`
  );

  // === AuthController (signup + login) ===
  zip.file(
    `${root}/src/main/java/${packagePath}/controller/AuthController.java`,
    `package ${packageName}.controller;

import ${packageName}.entity.User;
import ${packageName}.repository.UserRepository;
import ${packageName}.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public static class AuthRequest {
        public String username;
        public String password;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody AuthRequest request) {
        if (request.username == null || request.password == null) {
            return ResponseEntity.badRequest().body("Username and password are required");
        }

        if (userRepository.findByUsername(request.username).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Username already exists");
        }

        User user = new User();
        user.setUsername(request.username);
        user.setPassword(passwordEncoder.encode(request.password));
        user.setRole("USER");
        userRepository.save(user);

        String token = JwtUtil.generateToken(user.getUsername());
        Map<String, String> body = new HashMap<>();
        body.put("token", token);

        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        if (request.username == null || request.password == null) {
            return ResponseEntity.badRequest().body("Username and password are required");
        }

        User user = userRepository.findByUsername(request.username).orElse(null);
        if (user == null || !passwordEncoder.matches(request.password, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        String token = JwtUtil.generateToken(user.getUsername());
        Map<String, String> body = new HashMap<>();
        body.put("token", token);

        return ResponseEntity.ok(body);
    }
}
`
  );

  // === Security configuration using JWT + database-backed users ===
  zip.file(
    `${root}/src/main/java/${packagePath}/config/SecurityConfig.java`,
    `package ${packageName}.config;

import ${packageName}.security.JwtAuthenticationFilter;
import ${packageName}.repository.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/home", "/api/auth/**").permitAll()
                // All other endpoints require authentication via JWT
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(UserRepository userRepository) {
        return username -> userRepository.findByUsername(username)
            .map(user -> org.springframework.security.core.userdetails.User
                    .withUsername(user.getUsername())
                    .password(user.getPassword())
                    .roles(user.getRole())
                    .build()
            )
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }
}
`
  );
}
