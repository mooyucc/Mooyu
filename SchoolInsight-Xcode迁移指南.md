# School Insight 迁移到 Xcode 开发指南

本文档说明如何将 School Insight 的完整功能迁移到 Xcode 进行 iOS 原生应用开发。

## 📁 快速参考：关键代码文件路径

**建议先查看以下代码文件以了解实际实现：**

| 功能模块 | 文件路径 | 关键代码位置 | 说明 |
|---------|---------|-------------|------|
| **数据模型** | `server.js` | 第 40-89 行 | School 数据模型定义（包含 schoolType、affiliatedGroup） |
| **学校搜索** | `server.js` | 第 254-395 行 | 学校列表和搜索 API |
| **教育集团查询** | `server.js` | 第 360-395 行 | 根据教育集团查询学校 API |
| **流式AI评估** | `server.js` | 第 1132-1350 行 | 流式AI评分对比后端实现（SSE） |
| **标准AI评估** | `server.js` | 第 1353-1636 行 | 标准AI评分对比后端实现 |
| **前端流式处理** | `js/schoolinsight.js` | 第 869-1001 行 | 流式评估前端实现（handleCompareScoringStream） |
| **前端教育集团** | `js/schoolinsight.js` | 第 1238-1280 行 | 教育集团查询前端实现 |
| **字段兼容处理** | `js/schoolinsight.js` | 第 1108-1236 行 | schoolType/nature 兼容处理 |
| **UI界面** | `schoolinsight.html` | 全文 | 完整的HTML结构和样式 |
| **API文档** | `SchoolInsight-API接口清单.md` | 全文 | 完整的API接口文档 |

> 💡 **提示**：所有文件路径基于项目根目录。可以直接在代码仓库中搜索这些文件查看具体实现。

## 一、功能概览

School Insight 是一个学校查询与对比系统，包含以下核心功能：

### 1.1 前端功能（Web）
- **学校搜索**：支持按学校名称搜索
- **学校列表展示**：卡片式展示搜索结果
- **学校详情查看**：弹窗显示学校详细信息
- **多学校对比**：
  - 基础对比（基本信息、学段、课程等）
  - AI 评估对比（量化评分对比）
- **AI 辅助功能**：
  - 自动补充学校缺失信息
  - 智能搜索可能的学校名称
  - AI 评分评估

### 1.2 后端 API
- `GET /api/schools` - 获取学校列表（支持搜索）
- `GET /api/schools/:id` - 获取单个学校详情
- `GET /api/schools/by-group/:groupName` - 根据教育集团查询学校
- `POST /api/schools/create-from-name` - 根据名称创建学校
- `POST /api/schools/compare` - 基础对比
- `POST /api/schools/compare-scoring` - AI 评分对比（标准版本）
- `POST /api/schools/compare-scoring-stream` - AI 评分对比（流式版本，支持实时进度）

## 二、技术架构分析

### 2.1 前端技术栈
- **HTML/CSS/JavaScript**：纯前端实现
- **样式**：自定义 CSS，响应式设计
- **状态管理**：原生 JavaScript 变量和 Map/Set
- **API 调用**：Fetch API

### 2.2 后端技术栈
- **Node.js + Express**：RESTful API 服务器
- **MongoDB + Mongoose**：数据库和 ODM
- **AI 集成**：Deepseek API（用于学校信息补充和评分）

### 2.3 数据模型
学校数据包含以下字段：
- **基本信息**：序号、名称、网址、国家、城市、学校类型（schoolType）、涵盖学段、隶属教育集团（affiliatedGroup）
- **学段设置**：幼儿园、小学、初中、高中
- **IB 课程**：PYP、MYP、DP、CP
- **其他课程**：A-Level、AP、加拿大课程、澳大利亚课程、IGCSE、其他课程
- **AI 评估字段**：总分、各维度得分和说明、最终总结

**字段说明**：
- `schoolType`：学校类型（新增字段，替代/兼容旧的 `nature` 字段）
  - 可能值：`"公立学校"`、`"普通民办学校"`、`"民办双语学校"`、`"公立学校（国际部）"`
- `affiliatedGroup`：隶属教育集团（新增字段）
  - 如果学校隶属于某个教育集团，填写集团名称
  - 如果没有隶属任何教育集团，值为 `"无"`
- `nature`：学校性质（旧字段，保留以兼容旧数据，建议使用 `schoolType`）

## 三、迁移到 Xcode 的步骤

### 3.1 创建 iOS 项目

1. **在 Xcode 中创建新项目**
   - 选择 "iOS" > "App"
   - 使用 SwiftUI 或 UIKit（推荐 SwiftUI）
   - 项目名称：SchoolInsight

2. **项目结构建议**
   ```
   SchoolInsight/
   ├── Models/
   │   ├── School.swift
   │   └── ScoringData.swift
   ├── Views/
   │   ├── SearchView.swift
   │   ├── SchoolListView.swift
   │   ├── SchoolDetailView.swift
   │   ├── CompareView.swift
   │   └── ScoringCompareView.swift
   ├── ViewModels/
   │   ├── SchoolViewModel.swift
   │   └── CompareViewModel.swift
   ├── Services/
   │   ├── APIService.swift
   │   └── NetworkManager.swift
   ├── Utilities/
   │   └── Constants.swift
   └── Resources/
       └── Assets.xcassets
   ```

### 3.2 数据模型转换

#### 3.2.1 创建 School 模型（Swift）

```swift
import Foundation

struct School: Codable, Identifiable {
    let id: String
    let sequenceNumber: Int?
    let name: String
    let website: String?
    let country: String?
    let city: String?
    let schoolType: String? // 学校类型（新增，优先使用）
    let nature: String? // 学校性质（旧字段，保留兼容）
    let coveredStages: String?
    let affiliatedGroup: String? // 隶属教育集团（新增）
    
    // 学段设置
    let kindergarten: String?
    let primary: String?
    let juniorHigh: String?
    let seniorHigh: String?
    
    // IB课程
    let ibPYP: String?
    let ibMYP: String?
    let ibDP: String?
    let ibCP: String?
    
    // 其他课程
    let aLevel: String?
    let ap: String?
    let canadian: String?
    let australian: String?
    let igcse: String?
    let otherCourses: String?
    
    // AI评估字段
    let ai评估总分: Double?
    let ai评估课程声誉与体系成熟度得分: Double?
    let ai评估课程声誉与体系成熟度说明: String?
    // ... 其他AI评估字段
    
    // 计算属性：获取学校类型（优先使用schoolType，兼容nature）
    var displaySchoolType: String? {
        return schoolType ?? nature
    }
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case sequenceNumber
        case name
        case website
        case country
        case city
        case schoolType
        case nature
        case coveredStages
        case affiliatedGroup
        case kindergarten
        case primary
        case juniorHigh
        case seniorHigh
        case ibPYP
        case ibMYP
        case ibDP
        case ibCP
        case aLevel
        case ap
        case canadian
        case australian
        case igcse
        case otherCourses
        case ai评估总分 = "AI评估_总分"
        case ai评估课程声誉与体系成熟度得分 = "AI评估_课程声誉与体系成熟度_得分"
        case ai评估课程声誉与体系成熟度说明 = "AI评估_课程声誉与体系成熟度_说明"
        // ... 其他字段映射
    }
}
```

#### 3.2.2 创建 API 响应模型

```swift
struct SchoolsResponse: Codable {
    let schools: [School]
    let total: Int
    let page: Int
    let limit: Int
    let totalPages: Int
    let possibleSchoolNames: [String]?
}

struct CompareResponse: Codable {
    let schools: [School]
}

struct ScoringResponse: Codable {
    let schools: [School]
    let scoring: ScoringData
    let warning: ScoringWarning? // 评分警告（如学校性质不一致）
}

struct ScoringWarning: Codable {
    let type: String
    let message: String
}

struct SchoolsByGroupResponse: Codable {
    let schools: [School]
    let total: Int
    let groupName: String
}

struct ScoringData: Codable {
    let comparisonTable: [ComparisonRow]
    let totalScores: [String: Double]
    let summary: [String: SchoolSummary]
}

struct ComparisonRow: Codable {
    let dimension: String
    let indicator: String
    let weight: Int
    let scores: [String: Double]
    let explanations: [String: String]
}

struct SchoolSummary: Codable {
    let totalScore: Double
    let strengths: String?
    let characteristics: String?
    let suitableFor: String?
}
```

### 3.3 API 服务层实现

#### 3.3.1 创建 APIService

```swift
import Foundation

class APIService {
    static let shared = APIService()
    
    private let baseURL = "https://mooyu.cc/api" // 或你的服务器地址
    
    private init() {}
    
    // MARK: - 获取学校列表
    func searchSchools(query: String, page: Int = 1, limit: Int = 20) async throws -> SchoolsResponse {
        var components = URLComponents(string: "\(baseURL)/schools")!
        components.queryItems = [
            URLQueryItem(name: "search", value: query),
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "limit", value: "\(limit)")
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(SchoolsResponse.self, from: data)
    }
    
    // MARK: - 获取单个学校详情
    func getSchool(id: String) async throws -> School {
        guard let url = URL(string: "\(baseURL)/schools/\(id)") else {
            throw APIError.invalidURL
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(School.self, from: data)
    }
    
    // MARK: - 创建学校
    func createSchool(name: String) async throws -> School {
        guard let url = URL(string: "\(baseURL)/schools/create-from-name") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["schoolName": name]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(CreateSchoolResponse.self, from: data)
        return response.school
    }
    
    // MARK: - 基础对比
    func compareSchools(ids: [String]) async throws -> CompareResponse {
        guard let url = URL(string: "\(baseURL)/schools/compare") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["schoolIds": ids]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(CompareResponse.self, from: data)
    }
    
    // MARK: - 根据教育集团查询学校
    func getSchoolsByGroup(groupName: String) async throws -> SchoolsByGroupResponse {
        guard let encodedName = groupName.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let url = URL(string: "\(baseURL)/schools/by-group/\(encodedName)") else {
            throw APIError.invalidURL
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(SchoolsByGroupResponse.self, from: data)
    }
    
    // MARK: - AI评分对比（标准版本）
    func compareScoring(ids: [String]) async throws -> ScoringResponse {
        guard let url = URL(string: "\(baseURL)/schools/compare-scoring") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["schoolIds": ids]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(ScoringResponse.self, from: data)
    }
    
    // MARK: - AI评分对比（流式版本，支持实时进度）
    func compareScoringStream(ids: [String], progressHandler: @escaping (EvaluationEvent) -> Void) async throws -> ScoringResponse {
        guard let url = URL(string: "\(baseURL)/schools/compare-scoring-stream") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        
        let body = ["schoolIds": ids]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (asyncBytes, _) = try await URLSession.shared.bytes(for: request)
        var buffer = ""
        var finalResponse: ScoringResponse?
        
        for try await line in asyncBytes.lines {
            if line.hasPrefix("data: ") {
                let jsonString = String(line.dropFirst(6))
                if let data = jsonString.data(using: .utf8),
                   let event = try? JSONDecoder().decode(EvaluationEvent.self, from: data) {
                    progressHandler(event)
                    
                    // 如果是完成事件，解析最终结果
                    if event.type == "complete", let eventData = event.data {
                        if let schools = eventData["schools"] as? [[String: Any]],
                           let scoring = eventData["scoring"] as? [String: Any] {
                            // 解析最终响应
                            // 注意：这里需要根据实际返回的数据结构进行解析
                            // 示例代码，需要根据实际情况调整
                        }
                    }
                }
            }
        }
        
        guard let response = finalResponse else {
            throw APIError.invalidResponse
        }
        
        return response
    }
}

// 评估事件模型（用于流式响应）
struct EvaluationEvent: Codable {
    let type: String // "start", "step", "thinking", "evaluating", "complete", "error"
    let message: String
    let timestamp: String?
    let data: [String: Any]?
    
    enum CodingKeys: String, CodingKey {
        case type, message, timestamp, data
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        type = try container.decode(String.self, forKey: .type)
        message = try container.decode(String.self, forKey: .message)
        timestamp = try container.decodeIfPresent(String.self, forKey: .timestamp)
        
        // 处理data字段（可能是字典或null）
        if let dataContainer = try? container.nestedContainer(keyedBy: DynamicCodingKeys.self, forKey: .data) {
            var dataDict: [String: Any] = [:]
            for key in dataContainer.allKeys {
                if let value = try? dataContainer.decode(String.self, forKey: key) {
                    dataDict[key.stringValue] = value
                } else if let value = try? dataContainer.decode(Int.self, forKey: key) {
                    dataDict[key.stringValue] = value
                } else if let value = try? dataContainer.decode(Double.self, forKey: key) {
                    dataDict[key.stringValue] = value
                }
                // 可以添加更多类型支持
            }
            data = dataDict.isEmpty ? nil : dataDict
        } else {
            data = nil
        }
    }
    
    struct DynamicCodingKeys: CodingKey {
        var stringValue: String
        init?(stringValue: String) {
            self.stringValue = stringValue
        }
        var intValue: Int?
        init?(intValue: Int) {
            return nil
        }
    }
}

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case decodingError
}
```

### 3.4 UI 实现（SwiftUI）

#### 3.4.1 搜索视图

```swift
import SwiftUI

struct SearchView: View {
    @StateObject private var viewModel = SchoolViewModel()
    @State private var searchText = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // 搜索框
                HStack {
                    TextField("搜索学校名称...", text: $searchText)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .onSubmit {
                            viewModel.search(query: searchText)
                        }
                    
                    Button("搜索") {
                        viewModel.search(query: searchText)
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
                
                // 学校列表
                if viewModel.isLoading {
                    ProgressView("AI 评估中，请耐心等候...")
                } else if viewModel.schools.isEmpty {
                    EmptyStateView()
                } else {
                    SchoolListView(schools: viewModel.schools)
                }
            }
            .navigationTitle("School Insight")
        }
    }
}
```

#### 3.4.2 学校列表视图

```swift
struct SchoolListView: View {
    let schools: [School]
    @StateObject private var compareViewModel = CompareViewModel()
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 300))], spacing: 20) {
                ForEach(schools) { school in
                    SchoolCard(school: school, isSelected: compareViewModel.isSelected(school))
                        .onTapGesture {
                            // 显示详情
                        }
                }
            }
            .padding()
        }
        .overlay(alignment: .bottom) {
            if compareViewModel.hasSelection {
                CompareBar(viewModel: compareViewModel)
            }
        }
    }
}
```

#### 3.4.3 对比视图

```swift
struct CompareView: View {
    let schools: [School]
    @State private var compareMode: CompareMode = .basic
    @State private var scoringData: ScoringData?
    
    enum CompareMode {
        case basic
        case scoring
    }
    
    var body: some View {
        VStack {
            Picker("对比模式", selection: $compareMode) {
                Text("基础对比").tag(CompareMode.basic)
                Text("AI评估").tag(CompareMode.scoring)
            }
            .pickerStyle(.segmented)
            .padding()
            
            if compareMode == .basic {
                BasicCompareTable(schools: schools)
            } else {
                if let scoring = scoringData {
                    ScoringCompareView(scoring: scoring, schools: schools)
                } else {
                    ProgressView("正在生成AI评估...")
                        .onAppear {
                            loadScoring()
                        }
                }
            }
        }
    }
    
    private func loadScoring() {
        Task {
            let ids = schools.map { $0.id }
            do {
                let response = try await APIService.shared.compareScoring(ids: ids)
                scoringData = response.scoring
            } catch {
                // 处理错误
            }
        }
    }
}
```

### 3.5 ViewModel 实现

```swift
import SwiftUI
import Combine

class SchoolViewModel: ObservableObject {
    @Published var schools: [School] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    func search(query: String) {
        guard !query.isEmpty else { return }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let response = try await APIService.shared.searchSchools(query: query)
                await MainActor.run {
                    self.schools = response.schools
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
}

class CompareViewModel: ObservableObject {
    @Published var selectedSchools: Set<String> = []
    
    var hasSelection: Bool {
        !selectedSchools.isEmpty
    }
    
    func isSelected(_ school: School) -> Bool {
        selectedSchools.contains(school.id)
    }
    
    func toggleSelection(_ school: School) {
        if selectedSchools.contains(school.id) {
            selectedSchools.remove(school.id)
        } else {
            if selectedSchools.count < 3 {
                selectedSchools.insert(school.id)
            }
        }
    }
}
```

## 四、关键功能实现要点

### 4.1 学校搜索
- 使用 `TextField` 实现搜索输入
- 调用 `APIService.searchSchools()` 获取结果
- 处理 `possibleSchoolNames` 情况（显示选择界面）
- **新增**：支持点击教育集团名称进行关联查询（调用 `getSchoolsByGroup()`）

### 4.2 学校详情
- 使用 `Sheet` 或 `NavigationLink` 显示详情
- 按分类展示信息（基本信息、学段、课程等）
- 支持网址链接跳转
- **新增**：显示 `schoolType`（学校类型）和 `affiliatedGroup`（隶属教育集团）
- **新增**：教育集团字段可点击，跳转到该集团下的所有学校列表
- **兼容性**：优先显示 `schoolType`，如果不存在则显示 `nature`（兼容旧数据）

### 4.3 多学校对比
- **基础对比**：使用 `Table` 或自定义表格视图
- **AI 评分对比**：
  - **标准版本**：调用 `compareScoring()`，等待完整结果返回
  - **流式版本**：调用 `compareScoringStream()`，实时显示评估进度
    - 显示评估步骤（开始、检查信息、思考、评估各指标等）
    - 显示进度条和百分比
    - 显示实时日志
    - 评估完成后显示完整结果
  - 显示量化对比表
  - 显示总分和各项得分
  - 显示评分说明和总结
  - **新增**：显示评分警告（如学校性质不一致时的提示）
  - 使用图表可视化（可选）

### 4.4 状态管理
- 使用 `@StateObject` 和 `@ObservedObject` 管理状态
- 使用 `Combine` 处理异步操作
- 缓存对比数据以提高性能
- **新增**：管理流式评估进度状态（当前步骤、进度百分比、日志等）

### 4.5 流式AI评估实现要点

流式AI评估使用 Server-Sent Events (SSE) 协议，实时推送评估进度。实现要点：

1. **SSE 连接设置**
   - 使用 `URLSession.bytes(for:)` 方法建立流式连接
   - 设置请求头：`Accept: text/event-stream`
   - 设置响应头处理：`Content-Type: text/event-stream`

2. **事件解析**
   - SSE 事件格式：`data: {JSON对象}\n\n`
   - 逐行读取并解析 JSON 事件
   - 事件类型包括：
     - `start`: 评估开始
     - `step`: 评估步骤（如检查信息完整性）
     - `thinking`: AI 思考阶段
     - `evaluating`: 正在评估某个指标（包含进度信息）
     - `complete`: 评估完成（包含最终结果）
     - `error`: 评估出错

3. **进度更新**
   - 根据事件类型更新进度条（0-100%）
   - 显示当前评估步骤文本
   - 记录并显示实时日志
   - 显示评估耗时（计时器）

4. **结果处理**
   - 在 `complete` 事件中解析 `data.schools` 和 `data.scoring`
   - 解析 `data.warning`（如果有警告）
   - 更新UI显示最终对比结果

5. **错误处理**
   - 监听 `error` 事件
   - 处理网络中断
   - 处理超时情况
   - 提供重试机制

**示例代码结构**：
```swift
// 在 ViewModel 中
@Published var evaluationProgress: Double = 0
@Published var evaluationStep: String = ""
@Published var evaluationLogs: [String] = []

func startScoringStream(ids: [String]) async {
    do {
        try await APIService.shared.compareScoringStream(ids: ids) { event in
            DispatchQueue.main.async {
                switch event.type {
                case "start":
                    self.evaluationStep = event.message
                    self.evaluationProgress = 10
                case "step":
                    self.evaluationStep = event.message
                    self.evaluationProgress = 30
                case "thinking":
                    self.evaluationStep = event.message
                    self.evaluationProgress = 50
                case "evaluating":
                    self.evaluationStep = event.message
                    if let progress = event.data?["progress"] as? String {
                        // 解析进度 "1/10" 格式
                        // 更新进度条
                    }
                case "complete":
                    self.evaluationProgress = 100
                    // 解析最终结果
                case "error":
                    // 显示错误
                default:
                    break
                }
                // 添加日志
                if let timestamp = event.timestamp {
                    self.evaluationLogs.append("[\(timestamp)] \(event.message)")
                }
            }
        }
    } catch {
        // 处理错误
    }
}
```

## 五、UI/UX 设计建议

### 5.1 设计风格
- 参考 Web 版本的配色方案（主色：#F75C62）
- 使用 iOS 原生设计语言（SF Symbols、系统字体）
- 保持响应式布局

### 5.2 交互优化
- 使用 `PullToRefresh` 实现下拉刷新
- 使用 `LazyVStack` 或 `LazyVGrid` 优化列表性能
- 添加加载状态和错误提示
- 支持深色模式

### 5.3 动画效果
- 使用 SwiftUI 的 `animation` 修饰符
- 卡片点击动画
- 页面转场动画

## 六、数据持久化（可选）

### 6.1 本地缓存
- 使用 `UserDefaults` 存储搜索历史
- 使用 `Core Data` 或 `SwiftData` 缓存学校数据
- 实现离线查看功能

### 6.2 收藏功能
- 允许用户收藏学校
- 本地存储收藏列表

## 七、测试要点

### 7.1 功能测试
- 搜索功能
- 学校详情展示
- 对比功能（基础/AI）
- 错误处理

### 7.2 性能测试
- 大量数据加载
- 网络请求优化
- 内存管理

### 7.3 UI 测试
- 不同屏幕尺寸适配
- 深色模式测试
- 无障碍功能

## 八、部署注意事项

### 8.1 API 配置
- 确保后端 API 支持 CORS（如果跨域）
- 配置正确的 API 基础 URL
- 处理 API 错误和超时

### 8.2 网络权限
- 在 `Info.plist` 中配置网络权限
- 处理网络不可用情况

### 8.3 版本管理
- 使用 Git 进行版本控制
- 遵循语义化版本号

## 九、参考资源

### 9.1 相关代码文件位置（可直接查看参考）

以下文件路径基于项目根目录，Xcode 程序员可以直接查看这些文件来理解具体实现：

#### 前端代码文件
- **前端 HTML**：`schoolinsight.html`
  - 完整的 UI 结构和样式定义
  - 搜索框、学校卡片、对比视图、弹窗等组件
  
- **前端 JavaScript**：`js/schoolinsight.js`
  - 第 1-158 行：状态管理和初始化
  - 第 159-288 行：学校搜索和加载逻辑
  - 第 290-402 行：学校列表渲染和选择管理
  - 第 404-478 行：基础对比和 AI 评分对比处理
  - 第 480-569 行：对比表格渲染
  - 第 571-702 行：AI 评分对比结果渲染
  - 第 869-1001 行：**流式 AI 评估实现**（`handleCompareScoringStream` 函数）
  - 第 1058-1280 行：学校详情弹窗和教育集团查询

#### 后端代码文件
- **后端 API 服务器**：`server.js`
  - 第 39-91 行：**数据模型定义**（SchoolSchema，包含 schoolType 和 affiliatedGroup）
  - 第 254-395 行：学校列表和搜索 API（`GET /api/schools`）
  - 第 360-395 行：**根据教育集团查询**（`GET /api/schools/by-group/:groupName`）
  - 第 397-425 行：获取单个学校详情（`GET /api/schools/:id`）
  - 第 427-478 行：根据名称创建学校（`POST /api/schools/create-from-name`）
  - 第 483-506 行：基础对比（`POST /api/schools/compare`）
  - 第 1132-1350 行：**流式 AI 评分对比**（`POST /api/schools/compare-scoring-stream`）
    - 第 1139-1147 行：SSE 事件发送函数
    - 第 1174-1230 行：基础信息完整性检查
    - 第 1232-1258 行：AI 评估调用和流式处理
  - 第 1353-1636 行：标准 AI 评分对比（`POST /api/schools/compare-scoring`）
  - 第 1958-2031 行：**学校类型统一化函数**（`unifyNature`，nature 到 schoolType 的转换逻辑）

#### 数据迁移和工具脚本
- **数据库迁移脚本**：`migrate-nature-to-schooltype.js`
  - 将旧的 `nature` 字段迁移到新的 `schoolType` 字段
  
- **学校类型统一脚本**：`unify-school-nature.js`
  - 统一学校类型字段的格式和分类

#### 评估系统
- **评估体系定义**：`evaluation-system.js`
  - AI 评估的指标定义、权重分配、评分规则等

#### API 文档
- **API 接口清单**：`SchoolInsight-API接口清单.md`
  - 所有 API 接口的详细说明、请求参数、响应格式等

### 9.2 关键代码片段位置

#### 数据模型相关
- **School 模型定义**：`server.js` 第 40-89 行
- **字段映射示例**：`sync-school-data.js` 第 44-90 行（CSV 字段到数据库字段的映射）

#### 流式评估相关
- **前端流式处理**：`js/schoolinsight.js` 第 869-1001 行
  - `handleCompareScoringStream()` 函数：完整的流式处理实现
  - `handleEvaluationEvent()` 函数：事件处理逻辑
  - `appendEvaluationLiveLog()` 函数：实时日志追加
  
- **后端 SSE 实现**：`server.js` 第 1132-1350 行
  - SSE 响应头设置
  - 事件发送函数 `sendProgress()`
  - 流式评估流程

#### 教育集团查询相关
- **前端实现**：`js/schoolinsight.js` 第 1238-1280 行
  - `loadSchoolsByGroup()` 函数：根据教育集团加载学校列表
  - 教育集团链接点击事件处理
  
- **后端实现**：`server.js` 第 360-395 行
  - `GET /api/schools/by-group/:groupName` 路由处理

#### 学校类型兼容性处理
- **前端兼容处理**：`js/schoolinsight.js` 第 1108-1110 行、第 1172-1174 行、第 1186-1189 行
  - 优先使用 `schoolType`，不存在则使用 `nature`
  
- **后端兼容处理**：`server.js` 第 576-577 行、第 591 行、第 1671 行、第 1880 行
  - 多处使用 `school.schoolType || school.nature` 的兼容写法

### 9.2 快速参考：关键代码文件清单

**建议 Xcode 程序员按以下顺序查看代码文件：**

1. **首先查看数据模型**（了解数据结构）
   ```
   server.js (第 40-89 行) - School 数据模型定义
   ```

2. **查看 API 接口实现**（了解接口规范）
   ```
   server.js (第 254-395 行) - 学校搜索和列表 API
   server.js (第 360-395 行) - 教育集团查询 API
   server.js (第 1132-1350 行) - 流式 AI 评分对比 API
   server.js (第 1353-1636 行) - 标准 AI 评分对比 API
   ```

3. **查看前端实现**（了解交互逻辑）
   ```
   js/schoolinsight.js (第 869-1001 行) - 流式评估前端实现
   js/schoolinsight.js (第 1238-1280 行) - 教育集团查询前端实现
   js/schoolinsight.js (第 1108-1236 行) - 学校详情展示（包含字段兼容处理）
   ```

4. **查看 API 文档**（了解接口规范）
   ```
   SchoolInsight-API接口清单.md - 完整的 API 接口文档
   ```

### 9.3 学习资源
- SwiftUI 官方文档
- Combine 框架文档
- URLSession 网络编程
- Core Data / SwiftData 数据持久化
- Server-Sent Events (SSE) 协议文档

## 十、迁移检查清单

### 基础功能
- [ ] 创建 Xcode 项目
- [ ] 实现数据模型（School、ScoringData 等）
  - [ ] 添加 `schoolType` 字段
  - [ ] 添加 `affiliatedGroup` 字段
  - [ ] 实现 `displaySchoolType` 计算属性（兼容 `nature`）
- [ ] 实现 API 服务层
  - [ ] 实现基础 API（搜索、详情、对比）
  - [ ] 实现 `getSchoolsByGroup()` 方法
  - [ ] 实现 `compareScoring()` 标准版本
  - [ ] 实现 `compareScoringStream()` 流式版本
- [ ] 实现搜索视图
- [ ] 实现学校列表视图
- [ ] 实现学校详情视图
  - [ ] 显示 `schoolType` 和 `affiliatedGroup`
  - [ ] 实现教育集团名称点击跳转
- [ ] 实现基础对比视图
- [ ] 实现 AI 评分对比视图
  - [ ] 标准版本（等待完整结果）
  - [ ] 流式版本（实时进度显示）
  - [ ] 显示评分警告信息

### 高级功能
- [ ] 实现流式评估进度UI
  - [ ] 进度条和百分比显示
  - [ ] 当前步骤文本显示
  - [ ] 实时日志显示
  - [ ] 评估计时器
- [ ] 实现状态管理（ViewModel）
- [ ] 添加错误处理
- [ ] 添加加载状态
- [ ] UI/UX 优化
- [ ] 测试所有功能
  - [ ] 测试新旧字段兼容性
  - [ ] 测试流式评估功能
  - [ ] 测试教育集团关联查询
- [ ] 性能优化
- [ ] 准备发布

## 十一、常见问题

### Q1: 如何处理中文字段名？
A: 使用 `CodingKeys` 枚举映射中文字段名到 Swift 属性名。

### Q2: AI 评估数据格式复杂，如何解析？
A: 创建对应的 `Codable` 结构体，逐层解析 JSON 数据。

### Q3: 如何优化大量学校数据的展示？
A: 使用 `LazyVStack`/`LazyVGrid`，实现分页加载，添加本地缓存。

### Q4: 对比表格在 iOS 上如何实现？
A: 使用 SwiftUI 的 `Table`（iOS 16+）或自定义 `VStack`/`HStack` 布局。

### Q5: 如何实现流式AI评估进度显示？
A: 使用 `URLSession.bytes(for:)` 处理 SSE 流，逐行解析事件并更新UI。参考 `compareScoringStream()` 方法的实现。

### Q6: `schoolType` 和 `nature` 字段有什么区别？
A: `schoolType` 是新字段，统一了学校类型的分类标准（四种标准类型：`"公立学校"`、`"普通民办学校"`、`"民办双语学校"`、`"公立学校（国际部）"`）。`nature` 是旧字段，保留以兼容旧数据。建议优先使用 `schoolType`，如果不存在则回退到 `nature`。在 Swift 模型中可以使用计算属性 `displaySchoolType` 来统一处理。

### Q7: 如何实现教育集团关联查询？
A: 在学校详情页面，将 `affiliatedGroup` 字段显示为可点击链接，点击后调用 `getSchoolsByGroup(groupName:)` 接口，跳转到该集团下的学校列表。

### Q8: 流式评估和标准评估有什么区别？应该使用哪个？
A: 
- **标准评估** (`compare-scoring`)：等待完整结果返回，适合不需要实时反馈的场景，实现简单
- **流式评估** (`compare-scoring-stream`)：实时显示评估进度，用户体验更好，但实现较复杂
- **建议**：优先使用流式评估，如果流式评估失败则回退到标准评估

### Q7: 如何实现教育集团关联查询？
A: 在学校详情页面，将 `affiliatedGroup` 字段显示为可点击链接，点击后调用 `getSchoolsByGroup(groupName:)` 接口，跳转到该集团下的学校列表。

---

## 十二、最新更新（2025-01）

### 12.1 数据库字段更新
- ✅ 新增 `schoolType` 字段（学校类型）
- ✅ 新增 `affiliatedGroup` 字段（隶属教育集团）
- ✅ 保留 `nature` 字段以兼容旧数据

### 12.2 API 接口更新
- ✅ 新增 `/api/schools/compare-scoring-stream` 流式AI评分对比接口
- ✅ 新增 `/api/schools/by-group/:groupName` 根据教育集团查询接口
- ✅ AI评分对比响应新增 `warning` 字段（学校性质不一致警告）

### 12.3 功能优化
- ✅ AI评估支持流式输出，实时显示评估进度
- ✅ 学校详情页面支持点击教育集团名称进行关联查询
- ✅ 增加学校性质一致性检查，对比时提示用户

---

**注意**：本文档仅提供迁移指导，不修改现有代码。所有代码示例仅供参考，需要根据实际项目需求进行调整。

**最后更新日期**：2026-01-05

