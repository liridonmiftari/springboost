import { useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { 
  Rocket, 
  Terminal, 
  Settings2, 
  Layers, 
  Box, 
  Code2, 
  Coffee,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { projectConfigSchema, type ProjectConfig } from "@shared/schema";
import { AVAILABLE_DEPENDENCIES } from "@shared/routes";

import { useGenerateProject } from "@/hooks/use-generator";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DependencyCard } from "@/components/DependencyCard";
import { CliModal } from "@/components/CliModal";
import { StatsBanner } from "@/components/StatsBanner";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Home() {
  const { toast } = useToast();
  const [showCli, setShowCli] = useState(false);
  const generateMutation = useGenerateProject();

  const form = useForm<ProjectConfig>({
    resolver: zodResolver(projectConfigSchema),
    defaultValues: {
      groupId: "com.example",
      artifactId: "demo",
      name: "demo",
      description: "Demo project for Spring Boot",
      packageName: "com.example.demo",
      javaVersion: "17",
      bootVersion: "3.2.2",
      dependencies: [],
      scaffoldCrud: false,
      entityName: "Item",
      entities: [
        {
          name: "Item",
          fields: [
            {
              name: "name",
              type: "String",
            },
          ],
        },
      ],
      scaffoldAuth: false,
      seedData: false,
    },
  });

  const entitiesFieldArray = useFieldArray({
    control: form.control,
    name: "entities",
  });

  const onSubmit = (data: ProjectConfig) => {
    generateMutation.mutate(data, {
      onSuccess: (blob) => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${data.artifactId}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Project Generated!",
          description: "Your starter zip file is downloading.",
          className: "bg-primary text-primary-foreground border-none",
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: error.message,
        });
      }
    });
  };

  // Helper to toggle dependency in the array
  const toggleDependency = (id: string) => {
    const current = form.getValues("dependencies");
    const updated = current.includes(id) 
      ? current.filter(d => d !== id)
      : [...current, id];
    form.setValue("dependencies", updated, { shouldDirty: true });
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      {/* Hero Header */}
      <header className="relative overflow-hidden bg-card border-b border-border">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
        
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
              >
                <Rocket className="w-4 h-4" />
                <span>Production-ready Scaffolding</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground"
              >
                Spring<span className="text-primary">Boost</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-4 text-lg md:text-xl text-muted-foreground max-w-lg"
              >
                Skip the boilerplate. Generate opinionated, production-ready Spring Boot applications in seconds.
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="hidden md:block"
            >
              <div className="p-8 rounded-3xl bg-gradient-to-br from-primary/20 to-emerald-500/10 border border-primary/10 shadow-2xl backdrop-blur-xl">
                <Code2 className="w-24 h-24 text-primary" />
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      <StatsBanner />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12"
          >
            {/* Left Column: Project Config */}
            <div className="lg:col-span-5 space-y-8">
              <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Project Metadata</h2>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="group" className="text-xs font-semibold uppercase text-muted-foreground">Group</Label>
                      <Input {...form.register("groupId")} id="group" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="artifact" className="text-xs font-semibold uppercase text-muted-foreground">Artifact</Label>
                      <Input {...form.register("artifactId")} id="artifact" className="font-mono text-sm" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-semibold uppercase text-muted-foreground">Name</Label>
                    <Input {...form.register("name")} id="name" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs font-semibold uppercase text-muted-foreground">Description</Label>
                    <Input {...form.register("description")} id="description" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="package" className="text-xs font-semibold uppercase text-muted-foreground">Package Name</Label>
                    <Input {...form.register("packageName")} id="package" className="font-mono text-sm text-muted-foreground" />
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Java Version</Label>
                    <Controller
                      control={form.control}
                      name="javaVersion"
                      render={({ field }) => (
                        <RadioGroup 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="17" id="java-17" />
                            <Label htmlFor="java-17" className="font-mono cursor-pointer">17 (LTS)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="21" id="java-21" />
                            <Label htmlFor="java-21" className="font-mono cursor-pointer">21 (LTS)</Label>
                          </div>
                        </RadioGroup>
                      )}
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Spring Boot</Label>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-md bg-muted font-mono text-sm border border-border">3.2.2</div>
                      <span className="text-xs text-muted-foreground">(Latest Stable)</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Scaffolding Options</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Controller
                      control={form.control}
                      name="scaffoldCrud"
                      render={({ field }) => (
                        <Checkbox 
                          id="scaffoldCrud" 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      )}
                    />
                    <div className="grid gap-1.5 leading-none w-full">
                      <Label htmlFor="scaffoldCrud" className="cursor-pointer font-medium">Generate CRUD Scaffolding</Label>
                      <p className="text-sm text-muted-foreground">
                        Creates example Entity, Repository, Service, and Controller classes.
                      </p>
                      {form.watch("scaffoldCrud") && (
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">
                              Entities & Fields
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                entitiesFieldArray.append({
                                  name: "NewEntity",
                                  fields: [
                                    {
                                      name: "name",
                                      type: "String",
                                    },
                                  ],
                                })
                              }
                            >
                              + Add Entity
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {entitiesFieldArray.fields.map((field, index) => (
                              <div
                                key={field.id}
                                className="rounded-md border border-border p-3 space-y-3 bg-muted/40"
                              >
                                <div className="flex items-center gap-2">
                                  <Input
                                    {...form.register(`entities.${index}.name` as const)}
                                    className="h-8 text-sm"
                                    placeholder="Entity name (e.g. Car)"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-xs"
                                    onClick={() =>
                                      entitiesFieldArray.remove(index)
                                    }
                                  >
                                    ×
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-[11px] font-medium text-muted-foreground">
                                    Fields
                                  </Label>
                                  {form
                                    .watch(`entities.${index}.fields` as const)
                                    ?.map((_, fieldIndex) => (
                                      <div
                                        key={fieldIndex}
                                        className="flex gap-2 items-center"
                                      >
                                        <Input
                                          {...form.register(
                                            `entities.${index}.fields.${fieldIndex}.name` as const
                                          )}
                                          placeholder="fieldName"
                                          className="h-8 text-xs"
                                        />
                                        <select
                                          className="h-8 text-xs rounded-md border border-input bg-background px-2 py-1"
                                          {...form.register(
                                            `entities.${index}.fields.${fieldIndex}.type` as const
                                          )}
                                        >
                                          <option value="String">String</option>
                                          <option value="Long">Long</option>
                                          <option value="Integer">Integer</option>
                                          <option value="Double">Double</option>
                                          <option value="Boolean">Boolean</option>
                                          <option value="LocalDate">LocalDate</option>
                                          <option value="LocalDateTime">
                                            LocalDateTime
                                          </option>
                                        </select>
                                      </div>
                                    ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs mt-1"
                                    onClick={() => {
                                      const current =
                                        form.getValues(
                                          `entities.${index}.fields` as const
                                        ) || [];
                                      form.setValue(
                                        `entities.${index}.fields` as const,
                                        [
                                          ...current,
                                          { name: "field", type: "String" },
                                        ],
                                        { shouldDirty: true }
                                      );
                                    }}
                                  >
                                    + Add Field
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Controller
                      control={form.control}
                      name="seedData"
                      render={({ field }) => (
                        <Checkbox 
                          id="seedData" 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      )}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="seedData" className="cursor-pointer font-medium">Data Initializer (Seed Data)</Label>
                      <p className="text-sm text-muted-foreground">
                        Pre-populates the database with sample objects and users.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Controller
                      control={form.control}
                      name="scaffoldAuth"
                      render={({ field }) => (
                        <Checkbox 
                          id="scaffoldAuth" 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      )}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="scaffoldAuth" className="cursor-pointer font-medium">Add Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Configures Spring Security with a basic JWT or Session setup.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Dependencies */}
            <div className="lg:col-span-7 space-y-8">
              <motion.div variants={itemVariants} className="h-full flex flex-col">
                <div className="glass-panel rounded-2xl p-6 md:p-8 flex-grow">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                        <Box className="w-5 h-5" />
                      </div>
                      <h2 className="text-xl font-bold">Dependencies</h2>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {form.watch("dependencies").length} selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AVAILABLE_DEPENDENCIES.map((dep) => (
                      <Controller
                        key={dep.id}
                        control={form.control}
                        name="dependencies"
                        render={({ field }) => (
                          <DependencyCard 
                            id={dep.id}
                            name={dep.name}
                            description={dep.description}
                            selected={field.value.includes(dep.id)}
                            onToggle={toggleDependency}
                          />
                        )}
                      />
                    ))}
                  </div>

                  {form.watch("dependencies").length === 0 && (
                    <div className="mt-8 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-orange-700">No dependencies selected</h4>
                        <p className="text-xs text-orange-600/80 mt-1">
                          We recommend adding at least <strong>Spring Web</strong> for REST APIs.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <motion.div 
                  variants={itemVariants}
                  className="mt-8 sticky bottom-8 z-10"
                >
                  <div className="p-4 rounded-2xl bg-card border border-border shadow-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground hidden sm:flex">
                      <Coffee className="w-4 h-4" />
                      <span>Ready to code?</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCli(true)}
                        className="flex-1 sm:flex-none gap-2"
                      >
                        <Terminal className="w-4 h-4" />
                        CLI Mode
                      </Button>
                      
                      <Button
                        type="submit"
                        disabled={generateMutation.isPending}
                        className="flex-1 sm:flex-none gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
                      >
                        {generateMutation.isPending ? (
                          <>Generating...</>
                        ) : (
                          <>
                            <Rocket className="w-4 h-4" />
                            Generate Project
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </form>
      </main>

      <CliModal 
        open={showCli} 
        onOpenChange={setShowCli} 
        config={form.getValues()} 
      />
    </div>
  );
}
