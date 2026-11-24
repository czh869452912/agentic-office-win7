# Win7 兼容项目

目标平台为 Windows 7 SP1 x64。当前处于实施评估阶段，Win7 运行时和可发布安装包仍待验证。

| 内容                                             | 维护位置                                                     |
| ------------------------------------------------ | ------------------------------------------------------------ |
| 项目目标、功能范围 F01–F13、总体设计和估时       | [技术实施方案](../../GenOffice_Win7_Implementation_Plan.md)  |
| 工作项 W00–W06、依赖、当前状态                   | [实施台账](IMPLEMENTATION_STATUS.md)                         |
| 运行时门禁 RT01–RT09、产品验收 T01–T19、证据要求 | [验收矩阵](acceptance.md)                                    |
| 上游 Git 提交、运行时版本、锁文件哈希            | [基线清单](../../compat/manifest/baseline.json)              |
| 已确认的源码入口和工程风险                       | [上游审计](upstream-audit.md)                                |
| 实施入口、实验及验证顺序                         | [实施评估](implementation-assessment.md)                     |
| 实测后的优先级和运行时路线决策条件               | [后续开发计划](development-roadmap.md)                       |
| 系统补丁、VxKex 与 CLI 实测                      | [运行时路线验证](runtime-route-validation.md)                |
| 可复现实验结果                                   | [Office 渲染基线](evidence/render-baseline-windows-x64.json) |
| Win7 运行时对照步骤                              | [Electron 探针](runtime-test.md)                             |
| Docker 启动 Win7 与客体取证                      | [Docker 验证环境](docker-lab.md)                             |

新增实现时，在实施台账引用对应的 W、F 和验收 ID，注明依赖与可复现的验收方法。验收执行后，将记录与原始证据关联，再更新工作项状态。范围、发布条件或运行时路线发生变更时，将决定、依据、影响范围和验证方式随 Git 变更保存。方案中的估时和建议样本数量按目标终端实测校准。
